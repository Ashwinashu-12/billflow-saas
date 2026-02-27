const { v4: uuidv4 } = require('uuid');
const db = require('../database/connection');
const { respond, NotFoundError } = require('../utils/response');
const { parsePagination } = require('../utils/helpers');

/**
 * POST /api/v1/usage/log
 */
const logUsage = async (req, res, next) => {
    try {
        const { customer_id, subscription_id, metric_key, metric_name, quantity, unit, recorded_at, metadata } = req.body;
        const tenantId = req.tenantId;

        // Validate subscription belongs to tenant
        const subResult = await db.query(
            "SELECT s.*, up.unit_price, up.included_units FROM subscriptions s LEFT JOIN usage_pricing up ON up.plan_id = s.plan_id AND up.metric_key = $1 WHERE s.id = $2 AND s.tenant_id = $3 AND s.status = 'active'",
            [metric_key, subscription_id, tenantId]
        );
        if (subResult.rows.length === 0) throw new NotFoundError('Active subscription');
        const sub = subResult.rows[0];

        const unitPrice = sub.unit_price || 0;
        const amount = quantity * unitPrice;

        const result = await db.query(
            `INSERT INTO usage_logs (id, tenant_id, customer_id, subscription_id, metric_key, metric_name,
         quantity, unit, unit_price, amount, billed, recorded_at, billing_period_start, billing_period_end, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,$11,$12,$13,$14)
       RETURNING *`,
            [
                uuidv4(), tenantId, customer_id, subscription_id, metric_key, metric_name,
                quantity, unit || null, unitPrice, amount,
                recorded_at || new Date(),
                sub.current_period_start, sub.current_period_end,
                JSON.stringify(metadata || {}),
            ]
        );

        return respond(res).created(result.rows[0], 'Usage logged');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/usage/log/batch
 */
const logUsageBatch = async (req, res, next) => {
    try {
        const { logs } = req.body;
        if (!Array.isArray(logs) || logs.length === 0) {
            return respond(res).badRequest('logs array is required');
        }
        if (logs.length > 1000) {
            return respond(res).badRequest('Maximum 1000 logs per batch');
        }

        const tenantId = req.tenantId;
        const results = [];

        for (const log of logs) {
            const result = await db.query(
                `INSERT INTO usage_logs (id, tenant_id, customer_id, subscription_id, metric_key, metric_name,
           quantity, unit, unit_price, amount, billed, recorded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,0,false,$9)
         RETURNING id`,
                [
                    uuidv4(), tenantId, log.customer_id, log.subscription_id, log.metric_key,
                    log.metric_name, log.quantity, log.unit || null, log.recorded_at || new Date(),
                ]
            );
            results.push(result.rows[0].id);
        }

        return respond(res).created({ logged: results.length, ids: results }, `${results.length} usage records logged`);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/usage
 */
const list = async (req, res, next) => {
    try {
        const { page, limit } = parsePagination(req.query);
        const { customer_id, subscription_id, metric_key, billed, date_from, date_to } = req.query;

        const conditions = ['ul.tenant_id = $1'];
        const params = [req.tenantId];
        let idx = 2;

        if (customer_id) { conditions.push(`ul.customer_id = $${idx++}`); params.push(customer_id); }
        if (subscription_id) { conditions.push(`ul.subscription_id = $${idx++}`); params.push(subscription_id); }
        if (metric_key) { conditions.push(`ul.metric_key = $${idx++}`); params.push(metric_key); }
        if (billed !== undefined) { conditions.push(`ul.billed = $${idx++}`); params.push(billed === 'true'); }
        if (date_from) { conditions.push(`ul.recorded_at >= $${idx++}`); params.push(date_from); }
        if (date_to) { conditions.push(`ul.recorded_at <= $${idx++}`); params.push(date_to); }

        const where = conditions.join(' AND ');
        const countResult = await db.query(`SELECT COUNT(*) FROM usage_logs ul WHERE ${where}`, params);
        const total = parseInt(countResult.rows[0].count);

        const data = await db.query(
            `SELECT ul.*, c.first_name || ' ' || c.last_name AS customer_name
       FROM usage_logs ul
       JOIN customers c ON ul.customer_id = c.id
       WHERE ${where}
       ORDER BY ul.recorded_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
            [...params, limit, (page - 1) * limit]
        );

        return respond(res).paginated(data.rows, { total, page, limit });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/usage/summary/:subscriptionId
 */
const getSubscriptionUsageSummary = async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        const { period_start, period_end } = req.query;

        const subResult = await db.query(
            'SELECT * FROM subscriptions WHERE id = $1 AND tenant_id = $2',
            [subscriptionId, req.tenantId]
        );
        if (subResult.rows.length === 0) throw new NotFoundError('Subscription');
        const sub = subResult.rows[0];

        const start = period_start || sub.current_period_start;
        const end = period_end || sub.current_period_end;

        const summary = await db.query(
            `SELECT 
         metric_key, metric_name, unit,
         SUM(quantity) AS total_usage,
         SUM(amount) AS total_amount,
         COUNT(*) AS log_count,
         MIN(recorded_at) AS first_log,
         MAX(recorded_at) AS last_log,
         COUNT(*) FILTER (WHERE billed = true) AS billed_logs
       FROM usage_logs
       WHERE subscription_id = $1 AND tenant_id = $2
         AND recorded_at >= $3 AND recorded_at <= $4
       GROUP BY metric_key, metric_name, unit
       ORDER BY total_amount DESC`,
            [subscriptionId, req.tenantId, start, end]
        );

        // Get usage pricing for this plan
        const usagePricing = await db.query(
            'SELECT * FROM usage_pricing WHERE plan_id = $1 AND is_active = true',
            [sub.plan_id]
        );

        const summaryWithPricing = summary.rows.map(row => {
            const pricing = usagePricing.rows.find(p => p.metric_key === row.metric_key) || {};
            const includedUnits = pricing.included_units || 0;
            const billableUnits = Math.max(0, row.total_usage - includedUnits);
            const charged = billableUnits * (pricing.unit_price || 0);
            return {
                ...row,
                included_units: includedUnits,
                billable_units: billableUnits,
                unit_price: pricing.unit_price || 0,
                estimated_charge: charged,
            };
        });

        return respond(res).success({
            subscription_id: subscriptionId,
            period_start: start,
            period_end: end,
            metrics: summaryWithPricing,
            total_usage_charge: summaryWithPricing.reduce((s, r) => s + parseFloat(r.estimated_charge || 0), 0),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/usage/calculate/:subscriptionId
 * Calculate and aggregate unbilled usage into a billing calculation
 */
const calculateUsage = async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        const tenantId = req.tenantId;

        const subResult = await db.query(
            'SELECT s.*, p.id AS plan_id FROM subscriptions s JOIN plans p ON s.plan_id = p.id WHERE s.id = $1 AND s.tenant_id = $2',
            [subscriptionId, tenantId]
        );
        if (subResult.rows.length === 0) throw new NotFoundError('Subscription');
        const sub = subResult.rows[0];

        const usagePricing = await db.query(
            'SELECT * FROM usage_pricing WHERE plan_id = $1 AND is_active = true',
            [sub.plan_id]
        );

        const calculations = [];

        for (const up of usagePricing.rows) {
            const usageResult = await db.query(
                `SELECT SUM(quantity) AS total_usage
         FROM usage_logs
         WHERE subscription_id = $1 AND metric_key = $2 
           AND recorded_at >= $3 AND recorded_at <= $4 AND billed = false`,
                [subscriptionId, up.metric_key, sub.current_period_start, sub.current_period_end]
            );

            const totalUsage = parseFloat(usageResult.rows[0]?.total_usage || 0);
            const billableUnits = Math.max(0, totalUsage - up.included_units);
            const amount = billableUnits * up.unit_price;

            const calc = await db.query(
                `INSERT INTO billing_calculations (id, tenant_id, subscription_id, period_start, period_end,
           metric_key, total_usage, included_units, billable_units, unit_price, amount, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'calculated')
         RETURNING *`,
                [
                    uuidv4(), tenantId, subscriptionId, sub.current_period_start, sub.current_period_end,
                    up.metric_key, totalUsage, up.included_units, billableUnits, up.unit_price, amount,
                ]
            );
            calculations.push(calc.rows[0]);
        }

        return respond(res).success({ calculations, total_charge: calculations.reduce((s, c) => s + parseFloat(c.amount), 0) });
    } catch (err) {
        next(err);
    }
};

module.exports = { logUsage, logUsageBatch, list, getSubscriptionUsageSummary, calculateUsage };
