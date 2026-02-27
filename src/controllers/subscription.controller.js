const { v4: uuidv4 } = require('uuid');
const db = require('../database/connection');
const { respond, NotFoundError, ConflictError, AppError } = require('../utils/response');
const { getNextBillingDate, parsePagination } = require('../utils/helpers');
const { auditLog } = require('../middleware/audit');

/**
 * GET /api/v1/subscriptions
 */
const list = async (req, res, next) => {
    try {
        const { page, limit } = parsePagination(req.query);
        const { status, customer_id, plan_id, sort_by = 'created_at', sort_order = 'DESC' } = req.query;
        const tenantId = req.tenantId;

        const conditions = ['s.tenant_id = $1'];
        const params = [tenantId];
        let i = 2;

        if (status) { conditions.push(`s.status = $${i++}`); params.push(status); }
        if (customer_id) { conditions.push(`s.customer_id = $${i++}`); params.push(customer_id); }
        if (plan_id) { conditions.push(`s.plan_id = $${i++}`); params.push(plan_id); }

        const where = conditions.join(' AND ');
        const countResult = await db.query(`SELECT COUNT(*) FROM subscriptions s WHERE ${where}`, params);
        const total = parseInt(countResult.rows[0].count);

        const data = await db.query(
            `SELECT s.*,
              c.first_name || ' ' || c.last_name AS customer_name, c.email AS customer_email, c.company_name,
              p.name AS plan_name, p.billing_cycle, p.code AS plan_code
       FROM subscriptions s
       JOIN customers c ON s.customer_id = c.id
       JOIN plans p ON s.plan_id = p.id
       WHERE ${where}
       ORDER BY s.${sort_by} ${sort_order}
       LIMIT $${i} OFFSET $${i + 1}`,
            [...params, limit, (page - 1) * limit]
        );

        return respond(res).paginated(data.rows, { total, page, limit });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/subscriptions
 */
const create = async (req, res, next) => {
    try {
        const { customer_id, plan_id, quantity = 1, discount_percent = 0, start_date, notes, auto_renew = true } = req.body;
        const tenantId = req.tenantId;

        // Validate customer belongs to tenant
        const custResult = await db.query(
            'SELECT * FROM customers WHERE id = $1 AND tenant_id = $2 AND status = $3',
            [customer_id, tenantId, 'active']
        );
        if (custResult.rows.length === 0) throw new NotFoundError('Customer');

        // Validate plan
        const planResult = await db.query(
            'SELECT * FROM plans WHERE id = $1 AND tenant_id = $2 AND is_active = true',
            [plan_id, tenantId]
        );
        if (planResult.rows.length === 0) throw new NotFoundError('Plan');

        const plan = planResult.rows[0];
        const customer = custResult.rows[0];

        // Check for existing active sub to same plan
        const existingSub = await db.query(
            "SELECT id FROM subscriptions WHERE customer_id = $1 AND plan_id = $2 AND status IN ('active','trial')",
            [customer_id, plan_id]
        );
        if (existingSub.rows.length > 0) {
            throw new ConflictError('Customer already has an active subscription to this plan');
        }

        // Calculate amounts
        const unitAmount = plan.price;
        const subtotal = unitAmount * quantity;
        const discountAmount = (subtotal * discount_percent) / 100;
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = (taxableAmount * 18) / 100; // Default 18% GST
        const totalAmount = taxableAmount + taxAmount;

        const now = start_date ? new Date(start_date) : new Date();
        const isTrialing = plan.trial_days > 0;
        const status = isTrialing ? 'trial' : 'active';

        let trialEndsAt = null;
        let periodStart = now;
        let periodEnd;

        if (isTrialing) {
            trialEndsAt = new Date(now);
            trialEndsAt.setDate(trialEndsAt.getDate() + plan.trial_days);
            periodEnd = trialEndsAt;
        } else {
            periodEnd = getNextBillingDate(now, plan.billing_cycle, plan.billing_interval);
        }

        const nextBillingDate = isTrialing ? trialEndsAt : periodEnd;

        const subscription = await db.withTransaction(tenantId, async (client) => {
            const result = await client.query(
                `INSERT INTO subscriptions (id, tenant_id, customer_id, plan_id, status, quantity,
           unit_amount, discount_percent, discount_amount, subtotal, tax_amount, total_amount,
           currency, billing_cycle, started_at, trial_ends_at, current_period_start,
           current_period_end, next_billing_date, auto_renew, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
         RETURNING *`,
                [
                    uuidv4(), tenantId, customer_id, plan_id, status, quantity, unitAmount,
                    discount_percent, discountAmount, subtotal, taxAmount, totalAmount,
                    customer.currency || 'INR', plan.billing_cycle, now, trialEndsAt,
                    periodStart, periodEnd, nextBillingDate, auto_renew, notes, req.user.id,
                ]
            );
            const sub = result.rows[0];

            await client.query(
                `INSERT INTO subscription_history (id, subscription_id, tenant_id, event_type, to_plan_id,
           from_status, to_status, performed_by)
         VALUES ($1,$2,$3,$4,$5,NULL,$6,$7)`,
                [uuidv4(), sub.id, tenantId, isTrialing ? 'trial_started' : 'activated', plan_id, status, req.user.id]
            );

            // Add setup fee to invoice if applicable
            if (plan.setup_fee > 0) {
                // This would trigger invoice creation for setup fee
            }

            return sub;
        });

        await auditLog({
            tenantId, userId: req.user.id, action: 'subscription.created',
            resourceType: 'subscriptions', resourceId: subscription.id,
            newValues: { customer_id, plan_id, status, total_amount: totalAmount },
            ipAddress: req.ip,
        });

        return respond(res).created(subscription, 'Subscription created');
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/subscriptions/:id
 */
const getById = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT s.*,
              c.first_name || ' ' || c.last_name AS customer_name, c.email AS customer_email,
              c.company_name, c.phone AS customer_phone,
              p.name AS plan_name, p.billing_cycle, p.description AS plan_description,
              p.code AS plan_code, p.max_users, p.max_api_calls,
              json_agg(DISTINCT sh.* ORDER BY sh.created_at DESC) FILTER (WHERE sh.id IS NOT NULL) AS history
       FROM subscriptions s
       JOIN customers c ON s.customer_id = c.id
       JOIN plans p ON s.plan_id = p.id
       LEFT JOIN subscription_history sh ON sh.subscription_id = s.id
       WHERE s.id = $1 AND s.tenant_id = $2
       GROUP BY s.id, c.first_name, c.last_name, c.email, c.company_name, c.phone,
                p.name, p.billing_cycle, p.description, p.code, p.max_users, p.max_api_calls`,
            [req.params.id, req.tenantId]
        );
        if (result.rows.length === 0) throw new NotFoundError('Subscription');
        return respond(res).success(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/v1/subscriptions/:id/upgrade
 * Upgrade or downgrade plan
 */
const changePlan = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { plan_id, effective_immediately = true } = req.body;

        const subResult = await db.query(
            "SELECT * FROM subscriptions WHERE id = $1 AND tenant_id = $2 AND status IN ('active','trial')",
            [id, req.tenantId]
        );
        if (subResult.rows.length === 0) throw new NotFoundError('Active subscription');
        const sub = subResult.rows[0];

        const planResult = await db.query(
            'SELECT * FROM plans WHERE id = $1 AND tenant_id = $2 AND is_active = true',
            [plan_id, req.tenantId]
        );
        if (planResult.rows.length === 0) throw new NotFoundError('Plan');
        const newPlan = planResult.rows[0];

        const oldPlanId = sub.plan_id;
        const isUpgrade = newPlan.price > sub.unit_amount;
        const eventType = isUpgrade ? 'upgraded' : 'downgraded';

        const newSubtotal = newPlan.price * sub.quantity;
        const newDiscountAmount = (newSubtotal * sub.discount_percent) / 100;
        const newTaxableAmount = newSubtotal - newDiscountAmount;
        const newTaxAmount = (newTaxableAmount * 18) / 100;
        const newTotal = newTaxableAmount + newTaxAmount;

        await db.withTransaction(req.tenantId, async (client) => {
            await client.query(
                `UPDATE subscriptions SET plan_id = $1, unit_amount = $2, subtotal = $3,
           discount_amount = $4, tax_amount = $5, total_amount = $6, billing_cycle = $7
         WHERE id = $8`,
                [plan_id, newPlan.price, newSubtotal, newDiscountAmount, newTaxAmount, newTotal, newPlan.billing_cycle, id]
            );

            await client.query(
                `INSERT INTO subscription_history (id, subscription_id, tenant_id, event_type,
           from_plan_id, to_plan_id, from_status, to_status, performed_by, change_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9)`,
                [uuidv4(), id, req.tenantId, eventType, oldPlanId, plan_id, sub.status, req.user.id,
                `Plan ${eventType} by user`]
            );
        });

        await auditLog({
            tenantId: req.tenantId, userId: req.user.id,
            action: `subscription.${eventType}`, resourceType: 'subscriptions', resourceId: id,
            oldValues: { plan_id: oldPlanId }, newValues: { plan_id }, ipAddress: req.ip,
        });

        return respond(res).success({ subscription_id: id, new_plan: newPlan.name, event: eventType },
            `Subscription ${eventType} successfully`
        );
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/v1/subscriptions/:id/cancel
 */
const cancel = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { reason, cancel_at_period_end = true } = req.body;

        const subResult = await db.query(
            "SELECT * FROM subscriptions WHERE id = $1 AND tenant_id = $2 AND status NOT IN ('cancelled','expired')",
            [id, req.tenantId]
        );
        if (subResult.rows.length === 0) throw new NotFoundError('Active subscription');

        await db.withTransaction(req.tenantId, async (client) => {
            if (cancel_at_period_end) {
                await client.query(
                    `UPDATE subscriptions SET cancel_at_period_end = true, cancellation_reason = $1 WHERE id = $2`,
                    [reason, id]
                );
            } else {
                await client.query(
                    `UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW(), cancellation_reason = $1 WHERE id = $2`,
                    [reason, id]
                );
            }

            await client.query(
                `INSERT INTO subscription_history (id, subscription_id, tenant_id, event_type, from_status,
           to_status, change_reason, performed_by)
         VALUES ($1,$2,$3,'cancelled',$4,'cancelled',$5,$6)`,
                [uuidv4(), id, req.tenantId, subResult.rows[0].status, reason, req.user.id]
            );
        });

        const msg = cancel_at_period_end
            ? 'Subscription will be cancelled at end of billing period'
            : 'Subscription cancelled immediately';

        await auditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'subscription.cancelled', resourceType: 'subscriptions', resourceId: id, ipAddress: req.ip });
        return respond(res).success(null, msg);
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/v1/subscriptions/:id/pause
 */
const pause = async (req, res, next) => {
    try {
        const { id } = req.params;
        const subResult = await db.query(
            "SELECT * FROM subscriptions WHERE id = $1 AND tenant_id = $2 AND status = 'active'",
            [id, req.tenantId]
        );
        if (subResult.rows.length === 0) throw new NotFoundError('Active subscription');

        await db.withTransaction(req.tenantId, async (client) => {
            await client.query("UPDATE subscriptions SET status = 'paused' WHERE id = $1", [id]);
            await client.query(
                `INSERT INTO subscription_history (id, subscription_id, tenant_id, event_type, from_status, to_status, performed_by)
         VALUES ($1,$2,$3,'paused','active','paused',$4)`,
                [uuidv4(), id, req.tenantId, req.user.id]
            );
        });

        return respond(res).success(null, 'Subscription paused');
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/v1/subscriptions/:id/resume
 */
const resume = async (req, res, next) => {
    try {
        const { id } = req.params;
        const subResult = await db.query(
            "SELECT * FROM subscriptions WHERE id = $1 AND tenant_id = $2 AND status = 'paused'",
            [id, req.tenantId]
        );
        if (subResult.rows.length === 0) throw new NotFoundError('Paused subscription');

        await db.withTransaction(req.tenantId, async (client) => {
            await client.query("UPDATE subscriptions SET status = 'active' WHERE id = $1", [id]);
            await client.query(
                `INSERT INTO subscription_history (id, subscription_id, tenant_id, event_type, from_status, to_status, performed_by)
         VALUES ($1,$2,$3,'resumed','paused','active',$4)`,
                [uuidv4(), id, req.tenantId, req.user.id]
            );
        });

        return respond(res).success(null, 'Subscription resumed');
    } catch (err) {
        next(err);
    }
};

module.exports = { list, create, getById, changePlan, cancel, pause, resume };
