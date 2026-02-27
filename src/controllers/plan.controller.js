const { v4: uuidv4 } = require('uuid');
const db = require('../database/connection');
const { respond, NotFoundError, ConflictError } = require('../utils/response');
const { auditLog } = require('../middleware/audit');
const { parsePagination } = require('../utils/helpers');

/**
 * GET /api/v1/plans
 */
const list = async (req, res, next) => {
    try {
        const { page, limit } = parsePagination(req.query);
        const { is_active, billing_cycle, search } = req.query;
        const tenantId = req.tenantId;

        const conditions = ['p.tenant_id = $1'];
        const params = [tenantId];
        let i = 2;

        if (is_active !== undefined) { conditions.push(`p.is_active = $${i++}`); params.push(is_active === 'true'); }
        if (billing_cycle) { conditions.push(`p.billing_cycle = $${i++}`); params.push(billing_cycle); }
        if (search) { conditions.push(`(p.name ILIKE $${i} OR p.code ILIKE $${i})`); params.push(`%${search}%`); i++; }

        const where = conditions.join(' AND ');
        const countResult = await db.query(`SELECT COUNT(*) FROM plans p WHERE ${where}`, params);
        const total = parseInt(countResult.rows[0].count);

        const data = await db.query(
            `SELECT p.*,
              COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active') AS active_subscriptions,
              json_agg(DISTINCT pf.*) FILTER (WHERE pf.id IS NOT NULL) AS features,
              json_agg(DISTINCT up.*) FILTER (WHERE up.id IS NOT NULL) AS usage_pricing_rules
       FROM plans p
       LEFT JOIN subscriptions s ON s.plan_id = p.id
       LEFT JOIN plan_features pf ON pf.plan_id = p.id
       LEFT JOIN usage_pricing up ON up.plan_id = p.id
       WHERE ${where}
       GROUP BY p.id
       ORDER BY p.sort_order ASC, p.created_at DESC
       LIMIT $${i} OFFSET $${i + 1}`,
            [...params, limit, (page - 1) * limit]
        );

        return respond(res).paginated(data.rows, { total, page, limit });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/plans
 */
const create = async (req, res, next) => {
    try {
        const { features = [], usage_pricing: usagePricing = [], ...planData } = req.body;
        const tenantId = req.tenantId;

        const codeCheck = await db.query(
            'SELECT id FROM plans WHERE tenant_id = $1 AND code = $2', [tenantId, planData.code]
        );
        if (codeCheck.rows.length > 0) throw new ConflictError('Plan code already exists');

        const plan = await db.withTransaction(tenantId, async (client) => {
            const result = await client.query(
                `INSERT INTO plans (id, tenant_id, name, code, description, billing_cycle, billing_interval,
           price, currency, trial_days, setup_fee, max_users, max_storage_gb, max_api_calls, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true) RETURNING *`,
                [
                    uuidv4(), tenantId, planData.name, planData.code, planData.description,
                    planData.billing_cycle, planData.billing_interval || 1, planData.price,
                    planData.currency || 'INR', planData.trial_days || 0, planData.setup_fee || 0,
                    planData.max_users, planData.max_storage_gb, planData.max_api_calls,
                ]
            );
            const p = result.rows[0];

            for (const feat of features) {
                await client.query(
                    `INSERT INTO plan_features (id, plan_id, tenant_id, name, key, value, is_enabled)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                    [uuidv4(), p.id, tenantId, feat.name, feat.key, feat.value, feat.is_enabled !== false]
                );
            }

            for (const up of usagePricing) {
                await client.query(
                    `INSERT INTO usage_pricing (id, plan_id, tenant_id, metric_name, metric_key, unit_name,
             unit_price, included_units, pricing_model)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                    [
                        uuidv4(), p.id, tenantId, up.metric_name, up.metric_key, up.unit_name,
                        up.unit_price, up.included_units || 0, up.pricing_model || 'per_unit',
                    ]
                );
            }

            return p;
        });

        await auditLog({ tenantId, userId: req.user.id, action: 'plan.created', resourceType: 'plans', resourceId: plan.id, newValues: plan, ipAddress: req.ip });

        return respond(res).created(plan, 'Plan created');
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/plans/:id
 */
const getById = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT p.*,
              json_agg(DISTINCT pf.*) FILTER (WHERE pf.id IS NOT NULL) AS features,
              json_agg(DISTINCT up.*) FILTER (WHERE up.id IS NOT NULL) AS usage_pricing_rules,
              COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active') AS active_subscriptions
       FROM plans p
       LEFT JOIN plan_features pf ON pf.plan_id = p.id
       LEFT JOIN usage_pricing up ON up.plan_id = p.id
       LEFT JOIN subscriptions s ON s.plan_id = p.id
       WHERE p.id = $1 AND p.tenant_id = $2
       GROUP BY p.id`,
            [req.params.id, req.tenantId]
        );
        if (result.rows.length === 0) throw new NotFoundError('Plan');
        return respond(res).success(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/v1/plans/:id
 */
const update = async (req, res, next) => {
    try {
        const { features, usage_pricing: usagePricing, ...planData } = req.body;
        const { id } = req.params;

        const existing = await db.query(
            'SELECT * FROM plans WHERE id = $1 AND tenant_id = $2', [id, req.tenantId]
        );
        if (existing.rows.length === 0) throw new NotFoundError('Plan');

        const fields = [];
        const values = [];
        let i = 1;

        const updatable = ['name', 'description', 'price', 'trial_days', 'setup_fee',
            'max_users', 'max_storage_gb', 'max_api_calls', 'is_active', 'sort_order'];

        for (const field of updatable) {
            if (planData[field] !== undefined) {
                fields.push(`${field} = $${i++}`);
                values.push(planData[field]);
            }
        }

        values.push(id);
        const result = await db.query(
            `UPDATE plans SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
            values
        );

        await auditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'plan.updated', resourceType: 'plans', resourceId: id, oldValues: existing.rows[0], newValues: result.rows[0], ipAddress: req.ip });

        return respond(res).success(result.rows[0], 'Plan updated');
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/v1/plans/:id (soft delete)
 */
const remove = async (req, res, next) => {
    try {
        const { id } = req.params;
        const check = await db.query(
            'SELECT id FROM subscriptions WHERE plan_id = $1 AND status = $2 LIMIT 1',
            [id, 'active']
        );
        if (check.rows.length > 0) {
            return respond(res).conflict('Cannot deactivate plan with active subscriptions');
        }

        await db.query('UPDATE plans SET is_active = false WHERE id = $1 AND tenant_id = $2', [id, req.tenantId]);
        return respond(res).success(null, 'Plan deactivated');
    } catch (err) {
        next(err);
    }
};

module.exports = { list, create, getById, update, remove };
