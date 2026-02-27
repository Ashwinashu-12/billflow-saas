const { v4: uuidv4 } = require('uuid');
const db = require('../database/connection');
const { respond, NotFoundError } = require('../utils/response');
const { parsePagination } = require('../utils/helpers');
const { auditLog } = require('../middleware/audit');
const webhookService = require('../services/webhook.service');

/**
 * GET /api/v1/webhooks
 */
const list = async (req, res, next) => {
    try {
        const { page, limit } = parsePagination(req.query);
        const tenantId = req.tenantId;

        const result = await db.query(
            `SELECT w.*, COUNT(DISTINCT wl.id) AS total_deliveries,
              COUNT(DISTINCT wl.id) FILTER (WHERE wl.status = 'delivered') AS successful_deliveries,
              COUNT(DISTINCT wl.id) FILTER (WHERE wl.status = 'failed') AS failed_deliveries
       FROM webhooks w
       LEFT JOIN webhook_logs wl ON wl.webhook_id = w.id
       WHERE w.tenant_id = $1
       GROUP BY w.id
       ORDER BY w.created_at DESC
       LIMIT $2 OFFSET $3`,
            [tenantId, limit, (page - 1) * limit]
        );

        return respond(res).paginated(result.rows, { total: result.rows.length, page, limit });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/webhooks
 */
const create = async (req, res, next) => {
    try {
        const { name, url, events, retry_count = 3, timeout_seconds = 30, headers = {} } = req.body;
        const tenantId = req.tenantId;

        const crypto = require('crypto');
        const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;

        const result = await db.query(
            `INSERT INTO webhooks (id, tenant_id, name, url, secret, events, retry_count, timeout_seconds, headers, is_active, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10) RETURNING *`,
            [uuidv4(), tenantId, name, url, secret, events, retry_count, timeout_seconds, JSON.stringify(headers), req.user.id]
        );

        await auditLog({ tenantId, userId: req.user.id, action: 'webhook.created', resourceType: 'webhooks', resourceId: result.rows[0].id, ipAddress: req.ip });
        return respond(res).created(result.rows[0], 'Webhook registered');
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/webhooks/:id
 */
const getById = async (req, res, next) => {
    try {
        const result = await db.query(
            'SELECT * FROM webhooks WHERE id = $1 AND tenant_id = $2',
            [req.params.id, req.tenantId]
        );
        if (result.rows.length === 0) throw new NotFoundError('Webhook');
        return respond(res).success(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/v1/webhooks/:id
 */
const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, url, events, retry_count, timeout_seconds, headers, is_active } = req.body;

        const existing = await db.query('SELECT * FROM webhooks WHERE id = $1 AND tenant_id = $2', [id, req.tenantId]);
        if (existing.rows.length === 0) throw new NotFoundError('Webhook');

        const result = await db.query(
            `UPDATE webhooks SET name = COALESCE($1, name), url = COALESCE($2, url),
         events = COALESCE($3, events), retry_count = COALESCE($4, retry_count),
         timeout_seconds = COALESCE($5, timeout_seconds), headers = COALESCE($6, headers),
         is_active = COALESCE($7, is_active)
       WHERE id = $8 RETURNING *`,
            [name, url, events, retry_count, timeout_seconds, headers ? JSON.stringify(headers) : null, is_active, id]
        );

        return respond(res).success(result.rows[0], 'Webhook updated');
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/v1/webhooks/:id
 */
const remove = async (req, res, next) => {
    try {
        const result = await db.query('DELETE FROM webhooks WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]);
        if (result.rowCount === 0) throw new NotFoundError('Webhook');
        return respond(res).success(null, 'Webhook deleted');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/webhooks/:id/test
 */
const test = async (req, res, next) => {
    try {
        const { id } = req.params;
        const wh = await db.query('SELECT * FROM webhooks WHERE id = $1 AND tenant_id = $2', [id, req.tenantId]);
        if (wh.rows.length === 0) throw new NotFoundError('Webhook');

        const webhook = wh.rows[0];
        const result = await webhookService.deliverWebhook(webhook, 'webhook.test', uuidv4(), {
            event: 'webhook.test',
            message: 'This is a test event from SaaS Billing Platform',
            timestamp: new Date().toISOString(),
        });

        return respond(res).success(result, result.success ? 'Test webhook delivered' : 'Test webhook failed');
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/webhooks/:id/logs
 */
const getLogs = async (req, res, next) => {
    try {
        const { page, limit } = parsePagination(req.query);
        const { status } = req.query;

        const conditions = ['wl.webhook_id = $1 AND wl.tenant_id = $2'];
        const params = [req.params.id, req.tenantId];
        let idx = 3;

        if (status) { conditions.push(`wl.status = $${idx++}`); params.push(status); }

        const result = await db.query(
            `SELECT * FROM webhook_logs wl
       WHERE ${conditions.join(' AND ')}
       ORDER BY wl.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
            [...params, limit, (page - 1) * limit]
        );

        return respond(res).paginated(result.rows, { total: result.rows.length, page, limit });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/webhooks/available-events
 */
const availableEvents = async (req, res, next) => {
    const events = {
        'invoice.created': 'Invoice has been created',
        'invoice.sent': 'Invoice has been sent to customer',
        'invoice.paid': 'Invoice has been fully paid',
        'invoice.overdue': 'Invoice payment is overdue',
        'invoice.voided': 'Invoice has been voided',
        'payment.completed': 'Payment successfully completed',
        'payment.failed': 'Payment attempt failed',
        'payment.refunded': 'Payment has been refunded',
        'subscription.activated': 'Subscription has been activated',
        'subscription.cancelled': 'Subscription has been cancelled',
        'subscription.upgraded': 'Subscription plan upgraded',
        'subscription.downgraded': 'Subscription plan downgraded',
        'subscription.paused': 'Subscription has been paused',
        'subscription.expired': 'Subscription has expired',
        'customer.created': 'New customer has been created',
        'webhook.test': 'Test event',
    };
    return respond(res).success(events);
};

module.exports = { list, create, getById, update, remove, test, getLogs, availableEvents };
