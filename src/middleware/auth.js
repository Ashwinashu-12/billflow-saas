const jwt = require('jsonwebtoken');
const db = require('../database/connection');
const { UnauthorizedError, ForbiddenError, NotFoundError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('No authentication token provided');
        }

        const token = authHeader.substring(7);
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                throw new UnauthorizedError('Token expired');
            }
            throw new UnauthorizedError('Invalid token');
        }

        // Fetch user with role
        const result = await db.query(
            `SELECT u.id, u.tenant_id, u.email, u.first_name, u.last_name, u.is_active,
              u.role_id, r.name as role_name,
              t.slug as tenant_slug, t.is_active as tenant_active,
              t.name as tenant_name, t.currency, t.timezone, t.state
       FROM users u
       JOIN roles r ON u.role_id = r.id
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1 AND u.is_active = true`,
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            throw new UnauthorizedError('User not found or inactive');
        }

        const user = result.rows[0];

        if (!user.tenant_active) {
            throw new UnauthorizedError('Tenant account is inactive');
        }

        // Attach to request
        req.user = user;
        req.tenantId = user.tenant_id;

        // Fetch permissions for this role
        const permResult = await db.query(
            `SELECT p.resource, p.action
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = $1`,
            [user.role_id]
        );

        req.user.permissions = permResult.rows.map(p => `${p.resource}:${p.action}`);

        next();
    } catch (err) {
        next(err);
    }
};

/**
 * Permission check middleware factory
 * Usage: authorize('invoices', 'create')
 */
const authorize = (resource, action) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new UnauthorizedError());
        }

        const required = `${resource}:${action}`;
        const hasPermission = req.user.permissions.includes(required) ||
            req.user.permissions.includes(`${resource}:manage`) ||
            req.user.role_name === 'owner';

        if (!hasPermission) {
            logger.warn('Authorization failed', {
                userId: req.user.id,
                tenantId: req.tenantId,
                required,
                role: req.user.role_name,
            });
            return next(new ForbiddenError(`Insufficient permissions: ${required}`));
        }

        next();
    };
};

/**
 * Require specific roles
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new UnauthorizedError());
        }

        if (!roles.includes(req.user.role_name)) {
            return next(new ForbiddenError(`Requires one of roles: ${roles.join(', ')}`));
        }

        next();
    };
};

/**
 * Tenant header fallback - for cases where tenant_id is passed in header
 */
const optionalTenant = async (req, res, next) => {
    if (!req.tenantId && req.headers['x-tenant-id']) {
        req.tenantId = req.headers['x-tenant-id'];
    }
    next();
};

module.exports = { authenticate, authorize, requireRole, optionalTenant };
