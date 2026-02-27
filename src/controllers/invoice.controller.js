const { v4: uuidv4 } = require('uuid');
const db = require('../database/connection');
const { respond, NotFoundError, AppError } = require('../utils/response');
const { generateInvoiceNumber, calculateInvoiceTotals, parsePagination } = require('../utils/helpers');
const { auditLog } = require('../middleware/audit');
const pdfService = require('../services/pdf.service');
const webhookService = require('../services/webhook.service');

/**
 * GET /api/v1/invoices
 */
const list = async (req, res, next) => {
    try {
        const { page, limit } = parsePagination(req.query);
        const { status, customer_id, type, date_from, date_to, search } = req.query;

        const conditions = ['i.tenant_id = $1'];
        const params = [req.tenantId];
        let idx = 2;

        if (status) { conditions.push(`i.status = $${idx++}`); params.push(status); }
        if (customer_id) { conditions.push(`i.customer_id = $${idx++}`); params.push(customer_id); }
        if (type) { conditions.push(`i.type = $${idx++}`); params.push(type); }
        if (date_from) { conditions.push(`i.issue_date >= $${idx++}`); params.push(date_from); }
        if (date_to) { conditions.push(`i.issue_date <= $${idx++}`); params.push(date_to); }
        if (search) {
            conditions.push(`(i.invoice_number ILIKE $${idx} OR c.first_name ILIKE $${idx} OR c.email ILIKE $${idx})`);
            params.push(`%${search}%`); idx++;
        }

        const where = conditions.join(' AND ');
        const countResult = await db.query(
            `SELECT COUNT(*) FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE ${where}`, params
        );
        const total = parseInt(countResult.rows[0].count);

        const data = await db.query(
            `SELECT i.*, c.first_name || ' ' || c.last_name AS customer_name, c.email AS customer_email,
              c.company_name, CURRENT_DATE > i.due_date AND i.status NOT IN ('paid','void') AS is_overdue
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE ${where}
       ORDER BY i.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
            [...params, limit, (page - 1) * limit]
        );

        // Auto-mark overdue
        await db.query(
            `UPDATE invoices SET status = 'overdue' 
       WHERE tenant_id = $1 AND due_date < CURRENT_DATE AND status = 'sent'`,
            [req.tenantId]
        );

        return respond(res).paginated(data.rows, { total, page, limit });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/invoices
 */
const create = async (req, res, next) => {
    try {
        const { customer_id, subscription_id, items, tax_rules = [], ...invoiceData } = req.body;
        const tenantId = req.tenantId;

        // Validate customer
        const custResult = await db.query(
            'SELECT * FROM customers WHERE id = $1 AND tenant_id = $2', [customer_id, tenantId]
        );
        if (custResult.rows.length === 0) throw new NotFoundError('Customer');

        // Calculate totals
        const totals = calculateInvoiceTotals(items, invoiceData.discount_percent || 0, tax_rules);
        const invoiceNumber = await generateInvoiceNumber(tenantId);

        const invoice = await db.withTransaction(tenantId, async (client) => {
            const result = await client.query(
                `INSERT INTO invoices (id, tenant_id, customer_id, subscription_id, invoice_number, type,
           status, issue_date, due_date, billing_period_start, billing_period_end, currency,
           exchange_rate, subtotal, discount_percent, discount_amount, taxable_amount,
           tax_amount, total_amount, amount_paid, amount_due, notes, terms, reference_number,
           po_number, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,'draft',$7,$8,$9,$10,$11,1,$12,$13,$14,$15,$16,$17,0,$17,$18,$19,$20,$21,$22)
         RETURNING *`,
                [
                    uuidv4(), tenantId, customer_id, subscription_id || null, invoiceNumber,
                    invoiceData.type || 'invoice',
                    invoiceData.issue_date || new Date(),
                    invoiceData.due_date,
                    invoiceData.billing_period_start || null,
                    invoiceData.billing_period_end || null,
                    invoiceData.currency || 'INR',
                    totals.subtotal, invoiceData.discount_percent || 0, totals.discount_amount,
                    totals.taxable_amount, totals.tax_amount, totals.total_amount,
                    invoiceData.notes, invoiceData.terms, invoiceData.reference_number, invoiceData.po_number,
                    req.user.id,
                ]
            );
            const inv = result.rows[0];

            // Insert line items
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const itemAmount = item.quantity * item.unit_price;
                const itemDiscount = (itemAmount * (item.discount_percent || 0)) / 100;
                const netAmount = itemAmount - itemDiscount;
                const itemTax = (netAmount * (item.tax_rate || 0)) / 100;
                const amount = netAmount;

                await client.query(
                    `INSERT INTO invoice_items (id, invoice_id, tenant_id, type, description, quantity, unit,
             unit_price, discount_percent, discount_amount, tax_rate, tax_amount, amount, period_start,
             period_end, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
                    [
                        uuidv4(), inv.id, tenantId, item.type || 'one_time',
                        item.description, item.quantity, item.unit, item.unit_price,
                        item.discount_percent || 0, itemDiscount, item.tax_rate || 0, itemTax, amount,
                        item.period_start || null, item.period_end || null, i,
                    ]
                );
            }

            // Insert tax breakdown
            for (const tax of tax_rules) {
                await client.query(
                    `INSERT INTO invoice_taxes (id, invoice_id, tenant_id, tax_name, tax_type, tax_rate, taxable_amount, tax_amount)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                    [uuidv4(), inv.id, tenantId, tax.tax_name, tax.tax_type, tax.tax_rate, totals.taxable_amount, tax.tax_amount || ((totals.taxable_amount * tax.tax_rate) / 100)]
                );
            }

            return inv;
        });

        await auditLog({
            tenantId, userId: req.user.id, action: 'invoice.created',
            resourceType: 'invoices', resourceId: invoice.id,
            newValues: { invoice_number: invoiceNumber, total: totals.total_amount },
            ipAddress: req.ip,
        });

        // Fire webhook
        await webhookService.fire(tenantId, 'invoice.created', { invoice_id: invoice.id, invoice_number: invoiceNumber });

        return respond(res).created(invoice, 'Invoice created');
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/invoices/:id
 */
const getById = async (req, res, next) => {
    try {
        const invoiceResult = await db.query(
            `SELECT i.*,
              c.first_name || ' ' || c.last_name AS customer_name, c.email AS customer_email,
              c.company_name, c.phone AS customer_phone,
              t.name AS tenant_name, t.gstin AS tenant_gstin,
              t.address_line1, t.city, t.state, t.postal_code,
              json_agg(DISTINCT ii.* ORDER BY ii.sort_order) FILTER (WHERE ii.id IS NOT NULL) AS items,
              json_agg(DISTINCT it.*) FILTER (WHERE it.id IS NOT NULL) AS taxes
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       JOIN tenants t ON i.tenant_id = t.id
       LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
       LEFT JOIN invoice_taxes it ON it.invoice_id = i.id
       WHERE i.id = $1 AND i.tenant_id = $2
       GROUP BY i.id, c.first_name, c.last_name, c.email, c.company_name, c.phone,
                t.name, t.gstin, t.address_line1, t.city, t.state, t.postal_code`,
            [req.params.id, req.tenantId]
        );
        if (invoiceResult.rows.length === 0) throw new NotFoundError('Invoice');
        return respond(res).success(invoiceResult.rows[0]);
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/v1/invoices/:id/send
 */
const sendInvoice = async (req, res, next) => {
    try {
        const { id } = req.params;
        const inv = await db.query(
            "SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2 AND status = 'draft'",
            [id, req.tenantId]
        );
        if (inv.rows.length === 0) throw new NotFoundError('Draft invoice');

        await db.query(
            "UPDATE invoices SET status = 'sent', sent_at = NOW() WHERE id = $1", [id]
        );

        await auditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'invoice.sent', resourceType: 'invoices', resourceId: id, ipAddress: req.ip });
        await webhookService.fire(req.tenantId, 'invoice.sent', { invoice_id: id });

        return respond(res).success(null, 'Invoice marked as sent');
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/v1/invoices/:id/void
 */
const voidInvoice = async (req, res, next) => {
    try {
        const { id } = req.params;
        const inv = await db.query(
            "SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2 AND status NOT IN ('paid','void')",
            [id, req.tenantId]
        );
        if (inv.rows.length === 0) throw new NotFoundError('Invoice');

        await db.query("UPDATE invoices SET status = 'void' WHERE id = $1", [id]);

        await auditLog({ tenantId: req.tenantId, userId: req.user.id, action: 'invoice.voided', resourceType: 'invoices', resourceId: id, ipAddress: req.ip });
        return respond(res).success(null, 'Invoice voided');
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/invoices/:id/pdf
 */
const generatePDF = async (req, res, next) => {
    try {
        const { id } = req.params;
        const invResult = await db.query(
            `SELECT i.*, c.first_name || ' ' || c.last_name AS customer_name, c.email AS customer_email,
              c.company_name, c.phone AS customer_phone,
              t.name AS tenant_name, t.gstin AS tenant_gstin, t.email AS tenant_email,
              t.address_line1, t.city, t.state, t.postal_code,
              json_agg(DISTINCT ii.* ORDER BY ii.sort_order) FILTER (WHERE ii.id IS NOT NULL) AS items,
              json_agg(DISTINCT it.*) FILTER (WHERE it.id IS NOT NULL) AS taxes
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       JOIN tenants t ON i.tenant_id = t.id
       LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
       LEFT JOIN invoice_taxes it ON it.invoice_id = i.id
       WHERE i.id = $1 AND i.tenant_id = $2
       GROUP BY i.id, c.first_name, c.last_name, c.email, c.company_name, c.phone,
                t.name, t.gstin, t.email, t.address_line1, t.city, t.state, t.postal_code`,
            [id, req.tenantId]
        );
        if (invResult.rows.length === 0) throw new NotFoundError('Invoice');

        const invoice = invResult.rows[0];
        const pdfBuffer = await pdfService.generateInvoicePDF(invoice);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/invoices/generate-from-subscription/:subscriptionId
 */
const generateFromSubscription = async (req, res, next) => {
    try {
        const { subscriptionId } = req.params;
        const tenantId = req.tenantId;

        const subResult = await db.query(
            `SELECT s.*, p.name AS plan_name, p.price, p.billing_cycle,
              c.first_name || ' ' || c.last_name AS customer_name, c.email AS customer_email,
              c.currency, c.payment_terms
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       JOIN customers c ON s.customer_id = c.id
       WHERE s.id = $1 AND s.tenant_id = $2 AND s.status = 'active'`,
            [subscriptionId, tenantId]
        );
        if (subResult.rows.length === 0) throw new NotFoundError('Active subscription');
        const sub = subResult.rows[0];

        const invoiceNumber = await generateInvoiceNumber(tenantId);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (sub.payment_terms || 30));

        const items = [{
            type: 'subscription',
            description: `${sub.plan_name} - ${sub.billing_cycle} subscription`,
            quantity: sub.quantity,
            unit: 'month',
            unit_price: sub.unit_amount,
            discount_percent: sub.discount_percent || 0,
            tax_rate: 18,
        }];

        const totals = calculateInvoiceTotals(items, sub.discount_percent || 0, [{ rate: 18 }]);

        const invoice = await db.withTransaction(tenantId, async (client) => {
            const result = await client.query(
                `INSERT INTO invoices (id, tenant_id, customer_id, subscription_id, invoice_number, type,
           status, issue_date, due_date, billing_period_start, billing_period_end, currency,
           subtotal, discount_percent, discount_amount, taxable_amount, tax_amount, total_amount,
           amount_paid, amount_due, created_by)
         VALUES ($1,$2,$3,$4,$5,'invoice','draft',CURRENT_DATE,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,0,$15,$16)
         RETURNING *`,
                [
                    uuidv4(), tenantId, sub.customer_id, sub.id, invoiceNumber,
                    dueDate, sub.current_period_start, sub.current_period_end,
                    sub.currency || 'INR', totals.subtotal, sub.discount_percent || 0,
                    totals.discount_amount, totals.taxable_amount, totals.tax_amount,
                    totals.total_amount, req.user.id,
                ]
            );
            const inv = result.rows[0];

            await client.query(
                `INSERT INTO invoice_items (id, invoice_id, tenant_id, type, description, quantity, unit,
           unit_price, discount_percent, discount_amount, tax_rate, tax_amount, amount, sort_order)
         VALUES ($1,$2,$3,'subscription',$4,$5,'month',$6,$7,$8,18,$9,$10,0)`,
                [uuidv4(), inv.id, tenantId, `${sub.plan_name} - ${sub.billing_cycle} subscription`,
                sub.quantity, sub.unit_amount, sub.discount_percent || 0, totals.discount_amount,
                totals.tax_amount, totals.taxable_amount]
            );

            return inv;
        });

        await webhookService.fire(tenantId, 'invoice.created', { invoice_id: invoice.id });
        return respond(res).created(invoice, 'Invoice generated from subscription');
    } catch (err) {
        next(err);
    }
};

module.exports = { list, create, getById, sendInvoice, voidInvoice, generatePDF, generateFromSubscription };
