const { v4: uuidv4 } = require('uuid');
const db = require('../database/connection');
const { respond, NotFoundError, ConflictError } = require('../utils/response');
const { generateCustomerCode, parsePagination } = require('../utils/helpers');
const { auditLog } = require('../middleware/audit');

/**
 * GET /api/v1/customers
 */
const list = async (req, res, next) => {
    try {
        const { page, limit } = parsePagination(req.query);
        const { search, status, sort_by = 'created_at', sort_order = 'DESC' } = req.query;
        const tenantId = req.tenantId;

        const allowedSorts = ['created_at', 'first_name', 'last_name', 'email', 'company_name', 'outstanding_balance'];
        const sortCol = allowedSorts.includes(sort_by) ? sort_by : 'created_at';
        const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const conditions = ['c.tenant_id = $1'];
        const params = [tenantId];
        let i = 2;

        if (status) { conditions.push(`c.status = $${i++}`); params.push(status); }
        if (search) {
            conditions.push(`(c.first_name ILIKE $${i} OR c.last_name ILIKE $${i} OR c.email ILIKE $${i} OR c.company_name ILIKE $${i} OR c.code ILIKE $${i})`);
            params.push(`%${search}%`); i++;
        }

        const where = conditions.join(' AND ');

        const countResult = await db.query(
            `SELECT COUNT(*) FROM customers c WHERE ${where}`, params
        );
        const total = parseInt(countResult.rows[0].count);

        const data = await db.query(
            `SELECT c.*, 
              COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active') as active_subscriptions,
              COUNT(DISTINCT i.id) as total_invoices
       FROM customers c
       LEFT JOIN subscriptions s ON s.customer_id = c.id
       LEFT JOIN invoices i ON i.customer_id = c.id
       WHERE ${where}
       GROUP BY c.id
       ORDER BY c.${sortCol} ${sortDir}
       LIMIT $${i} OFFSET $${i + 1}`,
            [...params, limit, (page - 1) * limit]
        );

        return respond(res).paginated(data.rows, {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/customers
 */
const create = async (req, res, next) => {
    try {
        const { billing_address, tax_details, ...customerData } = req.body;
        const tenantId = req.tenantId;

        // Check email uniqueness within tenant
        const emailCheck = await db.query(
            'SELECT id FROM customers WHERE tenant_id = $1 AND email = $2',
            [tenantId, customerData.email]
        );
        if (emailCheck.rows.length > 0) throw new ConflictError('Customer with this email already exists');

        const code = customerData.code || await generateCustomerCode(tenantId);

        const customer = await db.withTransaction(tenantId, async (client) => {
            const result = await client.query(
                `INSERT INTO customers (id, tenant_id, code, company_name, first_name, last_name, email,
           phone, mobile, website, currency, payment_terms, credit_limit, source, notes, tags,
           status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'active',$17)
         RETURNING *`,
                [
                    uuidv4(), tenantId, code, customerData.company_name, customerData.first_name,
                    customerData.last_name, customerData.email, customerData.phone, customerData.mobile,
                    customerData.website, customerData.currency || 'INR', customerData.payment_terms || 30,
                    customerData.credit_limit || 0, customerData.source, customerData.notes,
                    customerData.tags || [], req.user.id,
                ]
            );
            const cust = result.rows[0];

            if (billing_address) {
                await client.query(
                    `INSERT INTO customer_addresses (id, customer_id, tenant_id, type, address_line1,
             address_line2, city, state, country, postal_code, is_default)
           VALUES ($1,$2,$3,'both',$4,$5,$6,$7,$8,$9,true)`,
                    [
                        uuidv4(), cust.id, tenantId, billing_address.address_line1,
                        billing_address.address_line2, billing_address.city, billing_address.state,
                        billing_address.country || 'India', billing_address.postal_code,
                    ]
                );
            }

            if (tax_details) {
                await client.query(
                    `INSERT INTO tax_details (id, customer_id, tenant_id, gstin, pan, tax_category, state_code)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                    [
                        uuidv4(), cust.id, tenantId, tax_details.gstin, tax_details.pan,
                        tax_details.tax_category || 'regular', tax_details.state_code,
                    ]
                );
            }

            return cust;
        });

        await auditLog({
            tenantId, userId: req.user.id, action: 'customer.created',
            resourceType: 'customers', resourceId: customer.id,
            newValues: { email: customer.email, code: customer.code },
            ipAddress: req.ip, requestId: req.requestId,
        });

        return respond(res).created(customer, 'Customer created successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/customers/:id
 */
const getById = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT c.*,
              json_agg(DISTINCT ca.*) FILTER (WHERE ca.id IS NOT NULL) AS addresses,
              json_agg(DISTINCT td.*) FILTER (WHERE td.id IS NOT NULL) AS tax_info,
              COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active') AS active_subscriptions,
              COUNT(DISTINCT i.id) AS total_invoices,
              COALESCE(SUM(i.total_amount) FILTER (WHERE i.status = 'paid'), 0) AS total_paid
       FROM customers c
       LEFT JOIN customer_addresses ca ON ca.customer_id = c.id
       LEFT JOIN tax_details td ON td.customer_id = c.id
       LEFT JOIN subscriptions s ON s.customer_id = c.id
       LEFT JOIN invoices i ON i.customer_id = c.id
       WHERE c.id = $1 AND c.tenant_id = $2
       GROUP BY c.id`,
            [req.params.id, req.tenantId]
        );
        if (result.rows.length === 0) throw new NotFoundError('Customer');
        return respond(res).success(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/v1/customers/:id
 */
const update = async (req, res, next) => {
    try {
        const { billing_address, tax_details, ...customerData } = req.body;
        const { id } = req.params;

        const existing = await db.query(
            'SELECT * FROM customers WHERE id = $1 AND tenant_id = $2', [id, req.tenantId]
        );
        if (existing.rows.length === 0) throw new NotFoundError('Customer');

        const fields = [];
        const values = [];
        let i = 1;

        const updatableFields = ['company_name', 'first_name', 'last_name', 'email', 'phone',
            'mobile', 'website', 'currency', 'payment_terms', 'credit_limit', 'source', 'notes', 'tags', 'status'];

        for (const field of updatableFields) {
            if (customerData[field] !== undefined) {
                fields.push(`${field} = $${i++}`);
                values.push(customerData[field]);
            }
        }

        if (fields.length === 0 && !billing_address && !tax_details) {
            return respond(res).success(existing.rows[0], 'No changes made');
        }

        let updated = existing.rows[0];
        if (fields.length > 0) {
            values.push(id);
            const result = await db.query(
                `UPDATE customers SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
                values
            );
            updated = result.rows[0];
        }

        if (billing_address) {
            await db.query(
                `INSERT INTO customer_addresses (id, customer_id, tenant_id, type, address_line1, address_line2,
           city, state, country, postal_code, is_default)
         VALUES ($1,$2,$3,'both',$4,$5,$6,$7,$8,$9,true)
         ON CONFLICT DO NOTHING`,
                [uuidv4(), id, req.tenantId, billing_address.address_line1, billing_address.address_line2,
                billing_address.city, billing_address.state, billing_address.country, billing_address.postal_code]
            );
        }

        await auditLog({
            tenantId: req.tenantId, userId: req.user.id,
            action: 'customer.updated', resourceType: 'customers', resourceId: id,
            oldValues: existing.rows[0], newValues: updated,
            ipAddress: req.ip, requestId: req.requestId,
        });

        return respond(res).success(updated, 'Customer updated');
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/v1/customers/:id
 */
const remove = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT id FROM customers WHERE id = $1 AND tenant_id = $2', [id, req.tenantId]
        );
        if (result.rows.length === 0) throw new NotFoundError('Customer');

        // Soft delete - set status to inactive
        await db.query(
            "UPDATE customers SET status = 'inactive' WHERE id = $1", [id]
        );

        await auditLog({
            tenantId: req.tenantId, userId: req.user.id,
            action: 'customer.deleted', resourceType: 'customers', resourceId: id,
            ipAddress: req.ip, requestId: req.requestId,
        });

        return respond(res).success(null, 'Customer deactivated');
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/customers/:id/subscriptions
 */
const getSubscriptions = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT s.*, p.name as plan_name, p.billing_cycle, p.price as plan_price
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.customer_id = $1 AND s.tenant_id = $2
       ORDER BY s.created_at DESC`,
            [req.params.id, req.tenantId]
        );
        return respond(res).success(result.rows);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/customers/:id/invoices  
 */
const getInvoices = async (req, res, next) => {
    try {
        const { page, limit } = parsePagination(req.query);
        const result = await db.query(
            `SELECT i.*, COUNT(*) OVER() AS total
       FROM invoices i
       WHERE i.customer_id = $1 AND i.tenant_id = $2
       ORDER BY i.created_at DESC
       LIMIT $3 OFFSET $4`,
            [req.params.id, req.tenantId, limit, (page - 1) * limit]
        );
        const total = result.rows[0]?.total || 0;
        return respond(res).paginated(result.rows, { total, page, limit });
    } catch (err) {
        next(err);
    }
};

module.exports = { list, create, getById, update, remove, getSubscriptions, getInvoices };
