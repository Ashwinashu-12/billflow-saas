const { v4: uuidv4 } = require('uuid');
const db = require('../database/connection');
const { respond, NotFoundError, AppError } = require('../utils/response');
const { generatePaymentNumber, parsePagination } = require('../utils/helpers');
const { auditLog } = require('../middleware/audit');
const webhookService = require('../services/webhook.service');

/**
 * GET /api/v1/payments
 */
const list = async (req, res, next) => {
    try {
        const { page, limit } = parsePagination(req.query);
        const { status, method, customer_id, date_from, date_to } = req.query;

        const conditions = ['p.tenant_id = $1'];
        const params = [req.tenantId];
        let idx = 2;

        if (status) { conditions.push(`p.status = $${idx++}`); params.push(status); }
        if (method) { conditions.push(`p.method = $${idx++}`); params.push(method); }
        if (customer_id) { conditions.push(`p.customer_id = $${idx++}`); params.push(customer_id); }
        if (date_from) { conditions.push(`p.payment_date >= $${idx++}`); params.push(date_from); }
        if (date_to) { conditions.push(`p.payment_date <= $${idx++}`); params.push(date_to); }

        const where = conditions.join(' AND ');
        const countResult = await db.query(`SELECT COUNT(*) FROM payments p WHERE ${where}`, params);
        const total = parseInt(countResult.rows[0].count);

        const data = await db.query(
            `SELECT p.*, 
              c.first_name || ' ' || c.last_name AS customer_name, c.email AS customer_email,
              i.invoice_number
       FROM payments p
       JOIN customers c ON p.customer_id = c.id
       LEFT JOIN invoices i ON p.invoice_id = i.id
       WHERE ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
            [...params, limit, (page - 1) * limit]
        );

        return respond(res).paginated(data.rows, { total, page, limit });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/payments
 */
const create = async (req, res, next) => {
    try {
        const {
            invoice_id, customer_id, subscription_id, method, gateway, gateway_payment_id,
            amount, currency, fees = 0, reference_number, cheque_number, bank_name,
            payment_date, notes,
        } = req.body;
        const tenantId = req.tenantId;

        // Validate customer
        const custResult = await db.query(
            'SELECT id FROM customers WHERE id = $1 AND tenant_id = $2', [customer_id, tenantId]
        );
        if (custResult.rows.length === 0) throw new NotFoundError('Customer');

        // Validate invoice if provided
        let invoice = null;
        if (invoice_id) {
            const invResult = await db.query(
                "SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2 AND status NOT IN ('paid','void')",
                [invoice_id, tenantId]
            );
            if (invResult.rows.length === 0) throw new NotFoundError('Payable invoice');
            invoice = invResult.rows[0];

            if (amount > invoice.amount_due + 0.01) {
                throw new AppError(`Payment amount (${amount}) exceeds invoice amount due (${invoice.amount_due})`, 400);
            }
        }

        const paymentNumber = await generatePaymentNumber(tenantId);
        const netAmount = amount - fees;

        const payment = await db.withTransaction(tenantId, async (client) => {
            // Create payment record
            const result = await client.query(
                `INSERT INTO payments (id, tenant_id, customer_id, invoice_id, subscription_id, payment_number,
           method, gateway, gateway_payment_id, status, amount, currency, exchange_rate, fees,
           net_amount, reference_number, cheque_number, bank_name, payment_date, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'completed',$10,$11,1,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING *`,
                [
                    uuidv4(), tenantId, customer_id, invoice_id || null, subscription_id || null,
                    paymentNumber, method, gateway || null, gateway_payment_id || null,
                    amount, currency || 'INR', fees, netAmount, reference_number || null,
                    cheque_number || null, bank_name || null, payment_date || new Date(),
                    notes || null, req.user.id,
                ]
            );
            const pmt = result.rows[0];

            // Create transaction record
            await client.query(
                `INSERT INTO payment_transactions (id, payment_id, tenant_id, type, amount, currency, status, gateway_txn_id)
         VALUES ($1,$2,$3,'charge',$4,$5,'completed',$6)`,
                [uuidv4(), pmt.id, tenantId, amount, currency || 'INR', gateway_payment_id || null]
            );

            // Update invoice if linked
            if (invoice_id && invoice) {
                const newAmountPaid = parseFloat(invoice.amount_paid) + parseFloat(amount);
                await client.query(
                    'UPDATE invoices SET amount_paid = $1 WHERE id = $2',
                    [newAmountPaid, invoice_id]
                );
                // The trigger will update amount_due and status automatically
            }

            return pmt;
        });

        await auditLog({
            tenantId, userId: req.user.id, action: 'payment.created',
            resourceType: 'payments', resourceId: payment.id,
            newValues: { amount, method, invoice_id },
            ipAddress: req.ip,
        });

        await webhookService.fire(tenantId, 'payment.completed', {
            payment_id: payment.id, amount, method, invoice_id,
        });

        return respond(res).created(payment, 'Payment recorded successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/payments/:id
 */
const getById = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT p.*,
              c.first_name || ' ' || c.last_name AS customer_name, c.email AS customer_email,
              i.invoice_number,
              json_agg(DISTINCT pt.*) FILTER (WHERE pt.id IS NOT NULL) AS transactions
       FROM payments p
       JOIN customers c ON p.customer_id = c.id
       LEFT JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN payment_transactions pt ON pt.payment_id = p.id
       WHERE p.id = $1 AND p.tenant_id = $2
       GROUP BY p.id, c.first_name, c.last_name, c.email, i.invoice_number`,
            [req.params.id, req.tenantId]
        );
        if (result.rows.length === 0) throw new NotFoundError('Payment');
        return respond(res).success(result.rows[0]);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/payments/:id/refund
 */
const refund = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { amount: refundAmount, reason } = req.body;

        const pmtResult = await db.query(
            "SELECT * FROM payments WHERE id = $1 AND tenant_id = $2 AND status = 'completed'",
            [id, req.tenantId]
        );
        if (pmtResult.rows.length === 0) throw new NotFoundError('Completed payment');
        const pmt = pmtResult.rows[0];

        const maxRefund = pmt.amount - pmt.refund_amount;
        if (refundAmount > maxRefund) {
            throw new AppError(`Refund amount exceeds refundable amount (${maxRefund})`, 400);
        }

        const newRefundTotal = parseFloat(pmt.refund_amount) + parseFloat(refundAmount);
        const isFullRefund = Math.abs(newRefundTotal - pmt.amount) < 0.01;

        await db.withTransaction(req.tenantId, async (client) => {
            await client.query(
                `UPDATE payments SET refund_amount = $1, refund_reason = $2, 
           status = $3 WHERE id = $4`,
                [newRefundTotal, reason, isFullRefund ? 'refunded' : 'partially_refunded', id]
            );

            await client.query(
                `INSERT INTO payment_transactions (id, payment_id, tenant_id, type, amount, currency, status)
         VALUES ($1,$2,$3,$4,$5,$6,'completed')`,
                [uuidv4(), id, req.tenantId, isFullRefund ? 'refund' : 'partial_refund', refundAmount, pmt.currency]
            );

            // Reverse invoice payment if linked
            if (pmt.invoice_id) {
                await client.query(
                    'UPDATE invoices SET amount_paid = amount_paid - $1 WHERE id = $2',
                    [refundAmount, pmt.invoice_id]
                );
            }
        });

        await auditLog({
            tenantId: req.tenantId, userId: req.user.id, action: 'payment.refunded',
            resourceType: 'payments', resourceId: id,
            newValues: { refund_amount: refundAmount, reason },
            ipAddress: req.ip,
        });

        await webhookService.fire(req.tenantId, 'payment.refunded', { payment_id: id, refund_amount: refundAmount });

        return respond(res).success({ refund_amount: refundAmount, is_full_refund: isFullRefund }, 'Refund processed');
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/payments/summary
 */
const summary = async (req, res, next) => {
    try {
        const { date_from, date_to } = req.query;
        const conditions = ['tenant_id = $1'];
        const params = [req.tenantId];
        let idx = 2;

        if (date_from) { conditions.push(`payment_date >= $${idx++}`); params.push(date_from); }
        if (date_to) { conditions.push(`payment_date <= $${idx++}`); params.push(date_to); }

        const result = await db.query(
            `SELECT 
         COUNT(*) AS total_payments,
         SUM(amount) FILTER (WHERE status = 'completed') AS total_collected,
         SUM(refund_amount) AS total_refunded,
         SUM(fees) AS total_fees,
         COUNT(*) FILTER (WHERE status = 'failed') AS failed_payments,
         json_object_agg(method, method_total) AS by_method
       FROM payments, LATERAL (
         SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS method_total
       ) method_agg
       WHERE ${conditions.join(' AND ')}`,
            params
        );

        const byMethod = await db.query(
            `SELECT method, COUNT(*) AS count, SUM(amount) AS total
       FROM payments WHERE ${conditions.join(' AND ')} AND status = 'completed'
       GROUP BY method`,
            params
        );

        return respond(res).success({ ...result.rows[0], by_method: byMethod.rows });
    } catch (err) {
        next(err);
    }
};

module.exports = { list, create, getById, refund, summary };
