const db = require('../database/connection');
const { respond } = require('../utils/response');
const { parsePagination } = require('../utils/helpers');

/**
 * GET /api/v1/audit
 */
const list = async (req, res, next) => {
    try {
        const { page, limit } = parsePagination(req.query);
        const { action, resource_type, user_id, date_from, date_to, status } = req.query;

        const conditions = ['al.tenant_id = $1'];
        const params = [req.tenantId];
        let idx = 2;

        if (action) { conditions.push(`al.action ILIKE $${idx++}`); params.push(`%${action}%`); }
        if (resource_type) { conditions.push(`al.resource_type = $${idx++}`); params.push(resource_type); }
        if (user_id) { conditions.push(`al.user_id = $${idx++}`); params.push(user_id); }
        if (status) { conditions.push(`al.status = $${idx++}`); params.push(status); }
        if (date_from) { conditions.push(`al.created_at >= $${idx++}`); params.push(date_from); }
        if (date_to) { conditions.push(`al.created_at <= $${idx++}`); params.push(date_to); }

        const where = conditions.join(' AND ');
        const countResult = await db.query(`SELECT COUNT(*) FROM audit_logs al WHERE ${where}`, params);
        const total = parseInt(countResult.rows[0].count);

        const data = await db.query(
            `SELECT al.*,
              u.first_name || ' ' || u.last_name AS user_name,
              u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE ${where}
       ORDER BY al.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
            [...params, limit, (page - 1) * limit]
        );

        return respond(res).paginated(data.rows, { total, page, limit });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/audit/:id
 */
const getById = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT al.*, u.first_name || ' ' || u.last_name AS user_name, u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.id = $1 AND al.tenant_id = $2`,
            [req.params.id, req.tenantId]
        );
        if (result.rows.length === 0) throw new Error('Audit log not found');
        return respond(res).success(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/audit/summary
 */
const summary = async (req, res, next) => {
    try {
        const { days = 30 } = req.query;
        const d = parseInt(days);

        const result = await db.query(
            `SELECT
         action,
         COUNT(*) AS count,
         COUNT(*) FILTER (WHERE status = 'success') AS success_count,
         COUNT(*) FILTER (WHERE status = 'failure') AS failure_count
       FROM audit_logs
       WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '${d} days'
       GROUP BY action
       ORDER BY count DESC
       LIMIT 20`,
            [req.tenantId]
        );

        return respond(res).success(result.rows);
    } catch (err) {
        next(err);
    }
};

module.exports = { list, getById, summary };
