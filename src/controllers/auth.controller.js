const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/connection');
const { respond, ConflictError, UnauthorizedError, NotFoundError } = require('../utils/response');
const { maskEmail } = require('../utils/helpers');
const logger = require('../utils/logger');

const generateTokens = (userId, tenantId) => {
    const accessToken = jwt.sign(
        { userId, tenantId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    const refreshToken = jwt.sign(
        { userId, tenantId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );
    return { accessToken, refreshToken };
};

/**
 * POST /api/v1/auth/register
 * Register a new tenant + owner user
 */
const register = async (req, res, next) => {
    try {
        const {
            name, slug, email, password, phone, website,
            first_name, last_name, currency, timezone,
        } = req.body;

        // Check slug uniqueness
        const slugCheck = await db.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
        if (slugCheck.rows.length > 0) throw new ConflictError('Tenant slug already taken');

        // Check email uniqueness
        const emailCheck = await db.query('SELECT id FROM tenants WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) throw new ConflictError('Email already registered');

        const result = await db.withTransaction(null, async (client) => {
            // 1. Create tenant
            const tenantResult = await client.query(
                `INSERT INTO tenants (id, name, slug, email, phone, website, currency, timezone, plan_tier)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'starter') RETURNING id`,
                [uuidv4(), name, slug, email, phone, website, currency || 'INR', timezone || 'Asia/Kolkata']
            );
            const tenantId = tenantResult.rows[0].id;

            // 2. Create default roles
            const roleNames = ['owner', 'admin', 'accountant', 'viewer'];
            const roleIds = {};
            for (const roleName of roleNames) {
                const r = await client.query(
                    `INSERT INTO roles (id, tenant_id, name, description, is_system)
           VALUES ($1,$2,$3,$4,true) RETURNING id`,
                    [uuidv4(), tenantId, roleName, `System ${roleName} role`]
                );
                roleIds[roleName] = r.rows[0].id;
            }

            // 3. Create permissions and assign to owner
            const resources = ['customers', 'plans', 'subscriptions', 'invoices', 'payments',
                'usage', 'reports', 'webhooks', 'audit_logs', 'users', 'settings'];
            const actions = ['create', 'read', 'update', 'delete', 'export', 'manage'];

            for (const resource of resources) {
                for (const action of actions) {
                    const permResult = await client.query(
                        `INSERT INTO permissions (id, resource, action)
             VALUES ($1,$2,$3) ON CONFLICT (resource, action) DO UPDATE SET resource = EXCLUDED.resource
             RETURNING id`,
                        [uuidv4(), resource, action]
                    );
                    // Owner gets all
                    await client.query(
                        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
                        [roleIds['owner'], permResult.rows[0].id]
                    );
                    // Admin gets all except manage
                    if (action !== 'manage') {
                        await client.query(
                            `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
                            [roleIds['admin'], permResult.rows[0].id]
                        );
                    }
                    // Viewer gets read
                    if (action === 'read') {
                        await client.query(
                            `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
                            [roleIds['viewer'], permResult.rows[0].id]
                        );
                    }
                }
            }

            // 4. Hash password and create owner user
            const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
            const userResult = await client.query(
                `INSERT INTO users (id, tenant_id, role_id, email, password_hash, first_name, last_name, is_active, is_email_verified)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true,true) RETURNING id`,
                [uuidv4(), tenantId, roleIds['owner'], email, passwordHash, first_name, last_name]
            );
            const userId = userResult.rows[0].id;

            return { tenantId, userId, roleIds };
        });

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(result.userId, result.tenantId);

        // Store refresh token hash
        const refreshHash = await bcrypt.hash(refreshToken, 8);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await db.query(
            `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6)`,
            [uuidv4(), result.userId, refreshHash, expiresAt, req.ip, req.headers['user-agent']]
        );

        logger.info('New tenant registered', { tenantId: result.tenantId, email });

        return respond(res).created({
            tenant_id: result.tenantId,
            user_id: result.userId,
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: 604800, // 7 days in seconds
        }, 'Registration successful');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
    try {
        const { email, password, tenant_slug } = req.body;

        let query = `
      SELECT u.id, u.tenant_id, u.email, u.password_hash, u.first_name, u.last_name,
             u.is_active, u.is_email_verified, r.name as role,
             t.slug, t.name as tenant_name, t.is_active as tenant_active
      FROM users u
      JOIN roles r ON u.role_id = r.id
      JOIN tenants t ON u.tenant_id = t.id
      WHERE LOWER(u.email) = LOWER($1)
    `;
        const params = [email];

        if (tenant_slug) {
            query += ' AND t.slug = $2';
            params.push(tenant_slug);
        }
        query += ' LIMIT 1';

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            throw new UnauthorizedError('Invalid email or password');
        }

        const user = result.rows[0];

        if (!user.is_active) throw new UnauthorizedError('Account is deactivated');
        if (!user.tenant_active) throw new UnauthorizedError('Tenant account is suspended');

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid email or password');
        }

        // Update last login
        await db.query(
            'UPDATE users SET last_login_at = NOW(), last_login_ip = $1 WHERE id = $2',
            [req.ip, user.id]
        );

        const { accessToken, refreshToken } = generateTokens(user.id, user.tenant_id);

        // Store refresh token
        const refreshHash = await bcrypt.hash(refreshToken, 8);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        await db.query(
            `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6)`,
            [uuidv4(), user.id, refreshHash, expiresAt, req.ip, req.headers['user-agent']]
        );

        logger.info('User logged in', { userId: user.id, tenantId: user.tenant_id });

        return respond(res).success({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: 604800,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                tenant_id: user.tenant_id,
                tenant_name: user.tenant_name,
                tenant_slug: user.slug,
            },
        }, 'Login successful');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/auth/refresh
 */
const refresh = async (req, res, next) => {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) throw new UnauthorizedError('Refresh token required');

        let decoded;
        try {
            decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
        } catch {
            throw new UnauthorizedError('Invalid or expired refresh token');
        }

        if (decoded.type !== 'refresh') throw new UnauthorizedError('Invalid token type');

        // Find stored refresh token
        const tokens = await db.query(
            `SELECT rt.*, u.is_active FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.user_id = $1 AND rt.revoked = false AND rt.expires_at > NOW()`,
            [decoded.userId]
        );

        let validToken = null;
        for (const t of tokens.rows) {
            const match = await bcrypt.compare(refresh_token, t.token_hash);
            if (match) { validToken = t; break; }
        }

        if (!validToken || !validToken.is_active) {
            throw new UnauthorizedError('Refresh token is invalid or revoked');
        }

        // Revoke old token
        await db.query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [validToken.id]);

        // Generate new tokens
        const { accessToken, newRefreshToken } = generateTokens(decoded.userId, decoded.tenantId);
        const refreshHash = await bcrypt.hash(newRefreshToken, 8);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await db.query(
            `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6)`,
            [uuidv4(), decoded.userId, refreshHash, expiresAt, req.ip, req.headers['user-agent']]
        );

        return respond(res).success({
            access_token: accessToken,
            refresh_token: newRefreshToken,
            expires_in: 604800,
        }, 'Token refreshed');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
    try {
        const { refresh_token } = req.body;
        if (refresh_token) {
            const tokens = await db.query(
                'SELECT * FROM refresh_tokens WHERE user_id = $1 AND revoked = false',
                [req.user.id]
            );
            for (const t of tokens.rows) {
                const match = await bcrypt.compare(refresh_token, t.token_hash);
                if (match) {
                    await db.query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [t.id]);
                    break;
                }
            }
        }
        return respond(res).success(null, 'Logged out successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/auth/me
 */
const me = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
              u.is_active, u.is_email_verified, u.two_fa_enabled, u.last_login_at,
              u.preferences, u.created_at,
              r.name as role, r.id as role_id,
              t.id as tenant_id, t.name as tenant_name, t.slug as tenant_slug,
              t.currency, t.timezone, t.plan_tier, t.gstin, t.logo_url
       FROM users u
       JOIN roles r ON u.role_id = r.id
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1`,
            [req.user.id]
        );

        const user = result.rows[0];
        user.permissions = req.user.permissions;

        return respond(res).success(user);
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/v1/auth/change-password
 */
const changePassword = async (req, res, next) => {
    try {
        const { current_password, new_password } = req.body;

        const result = await db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );

        const isValid = await bcrypt.compare(current_password, result.rows[0].password_hash);
        if (!isValid) throw new UnauthorizedError('Current password is incorrect');

        const newHash = await bcrypt.hash(new_password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

        // Revoke all refresh tokens
        await db.query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [req.user.id]);

        return respond(res).success(null, 'Password changed successfully');
    } catch (err) {
        next(err);
    }
};

module.exports = { register, login, refresh, logout, me, changePassword };
