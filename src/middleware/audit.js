const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const db = require('../database/connection');

/**
 * Audit logging middleware - logs after request completes
 */
const auditMiddleware = (action, resourceType) => {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);
        const startTime = Date.now();

        res.json = function (body) {
            res.json = originalJson;
            const result = originalJson(body);

            // Log asynchronously (don't block response)
            setImmediate(async () => {
                try {
                    const duration = Date.now() - startTime;
                    const status = res.statusCode < 400 ? 'success' : 'failure';
                    const resourceId = req.params.id || (body?.data?.id) || null;

                    await db.query(
                        `INSERT INTO audit_logs (id, tenant_id, user_id, action, resource_type, resource_id,
              new_values, ip_address, user_agent, request_id, status, duration_ms)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                        [
                            uuidv4(),
                            req.tenantId,
                            req.user?.id,
                            action,
                            resourceType,
                            resourceId,
                            status === 'success' && body?.data ? JSON.stringify(body.data) : null,
                            req.ip,
                            req.headers['user-agent']?.substring(0, 255),
                            req.requestId,
                            status,
                            duration,
                        ]
                    );
                } catch (err) {
                    logger.error('Audit log failed', { error: err.message });
                }
            });

            return result;
        };

        next();
    };
};

/**
 * Audit log a specific event manually
 */
const auditLog = async ({
    tenantId,
    userId,
    action,
    resourceType,
    resourceId,
    oldValues,
    newValues,
    changes,
    ipAddress,
    userAgent,
    requestId,
    status = 'success',
    errorMessage,
    duration,
    metadata,
}) => {
    try {
        await db.query(
            `INSERT INTO audit_logs (id, tenant_id, user_id, action, resource_type, resource_id,
        old_values, new_values, changes, ip_address, user_agent, request_id, status,
        error_message, duration_ms, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
            [
                uuidv4(),
                tenantId,
                userId,
                action,
                resourceType,
                resourceId,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                changes ? JSON.stringify(changes) : null,
                ipAddress,
                userAgent?.substring(0, 255),
                requestId,
                status,
                errorMessage,
                duration,
                metadata ? JSON.stringify(metadata) : null,
            ]
        );
    } catch (err) {
        logger.error('Manual audit log failed', { error: err.message, action, resourceType });
    }
};

module.exports = { auditMiddleware, auditLog };
