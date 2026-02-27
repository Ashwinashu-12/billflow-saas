const db = require('../database/connection');
const { respond } = require('../utils/response');

/**
 * GET /api/v1/reports/dashboard
 */
const dashboard = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        const { period = '30' } = req.query;
        const days = parseInt(period) || 30;

        const [mrrResult, invoiceStats, paymentStats, customerStats, churnResult] = await Promise.all([
            // MRR calculation
            db.query(
                `SELECT 
           COALESCE(SUM(CASE
             WHEN p.billing_cycle = 'monthly' THEN s.total_amount
             WHEN p.billing_cycle = 'yearly'  THEN s.total_amount / 12
             WHEN p.billing_cycle = 'quarterly' THEN s.total_amount / 3
             WHEN p.billing_cycle = 'weekly' THEN s.total_amount * 4
             ELSE s.total_amount
           END), 0) AS mrr,
           COALESCE(SUM(CASE
             WHEN p.billing_cycle = 'monthly' THEN s.total_amount * 12
             WHEN p.billing_cycle = 'yearly'  THEN s.total_amount
             WHEN p.billing_cycle = 'quarterly' THEN s.total_amount * 4
             WHEN p.billing_cycle = 'weekly' THEN s.total_amount * 52
             ELSE s.total_amount * 12
           END), 0) AS arr,
           COUNT(DISTINCT s.id) AS active_subscriptions,
           COUNT(DISTINCT s.customer_id) AS paying_customers
         FROM subscriptions s
         JOIN plans p ON s.plan_id = p.id
         WHERE s.tenant_id = $1 AND s.status = 'active'`,
                [tenantId]
            ),

            // Invoice stats
            db.query(
                `SELECT
           COUNT(*) AS total_invoices,
           COUNT(*) FILTER (WHERE status = 'paid') AS paid_invoices,
           COUNT(*) FILTER (WHERE status IN ('sent','overdue')) AS outstanding_invoices,
           COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_invoices,
           COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0) AS total_invoiced_paid,
           COALESCE(SUM(amount_due) FILTER (WHERE status IN ('sent','overdue','partially_paid')), 0) AS total_outstanding
         FROM invoices WHERE tenant_id = $1 AND issue_date >= NOW() - INTERVAL '${days} days'`,
                [tenantId]
            ),

            // Payment stats
            db.query(
                `SELECT
           COUNT(*) AS total_payments,
           COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS total_collected,
           COALESCE(SUM(amount) FILTER (WHERE status = 'failed'), 0) AS total_failed,
           COALESCE(SUM(refund_amount), 0) AS total_refunded,
           COUNT(*) FILTER (WHERE status = 'failed') AS failed_count
         FROM payments WHERE tenant_id = $1 AND payment_date >= NOW() - INTERVAL '${days} days'`,
                [tenantId]
            ),

            // Customer stats
            db.query(
                `SELECT
           COUNT(*) AS total_customers,
           COUNT(*) FILTER (WHERE status = 'active') AS active_customers,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '${days} days') AS new_customers,
           COUNT(*) FILTER (WHERE status = 'churned') AS churned_customers
         FROM customers WHERE tenant_id = $1`,
                [tenantId]
            ),

            // Churn rate (cancelled subscriptions / total at start of period)
            db.query(
                `SELECT
           COUNT(*) FILTER (WHERE status = 'cancelled' AND cancelled_at >= NOW() - INTERVAL '${days} days') AS cancelled,
           COUNT(*) FILTER (WHERE started_at <= NOW() - INTERVAL '${days} days') AS total_at_start
         FROM subscriptions WHERE tenant_id = $1`,
                [tenantId]
            ),
        ]);

        const mrr = mrrResult.rows[0];
        const invoices = invoiceStats.rows[0];
        const payments = paymentStats.rows[0];
        const customers = customerStats.rows[0];
        const churn = churnResult.rows[0];
        const churnRate = churn.total_at_start > 0
            ? ((churn.cancelled / churn.total_at_start) * 100).toFixed(2)
            : '0.00';

        return respond(res).success({
            period_days: days,
            revenue: {
                mrr: parseFloat(mrr.mrr),
                arr: parseFloat(mrr.arr),
                total_collected: parseFloat(payments.total_collected),
                total_refunded: parseFloat(payments.total_refunded),
            },
            subscriptions: {
                active: parseInt(mrr.active_subscriptions),
                paying_customers: parseInt(mrr.paying_customers),
                churn_rate: parseFloat(churnRate),
                cancelled_this_period: parseInt(churn.cancelled),
            },
            invoices: {
                total: parseInt(invoices.total_invoices),
                paid: parseInt(invoices.paid_invoices),
                outstanding: parseInt(invoices.outstanding_invoices),
                overdue: parseInt(invoices.overdue_invoices),
                total_outstanding_amount: parseFloat(invoices.total_outstanding),
            },
            customers: {
                total: parseInt(customers.total_customers),
                active: parseInt(customers.active_customers),
                new_this_period: parseInt(customers.new_customers),
                churned: parseInt(customers.churned_customers),
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/reports/mrr
 */
const mrrReport = async (req, res, next) => {
    try {
        const { months = 12 } = req.query;
        const tenantId = req.tenantId;

        const result = await db.query(
            `SELECT 
         TO_CHAR(DATE_TRUNC('month', s.started_at), 'YYYY-MM') AS month,
         COUNT(DISTINCT s.id) AS new_subscriptions,
         COUNT(DISTINCT s.customer_id) AS new_customers,
         COALESCE(SUM(CASE
           WHEN p.billing_cycle = 'monthly' THEN s.total_amount
           WHEN p.billing_cycle = 'yearly'  THEN s.total_amount / 12
           WHEN p.billing_cycle = 'quarterly' THEN s.total_amount / 3
           ELSE s.total_amount
         END), 0) AS new_mrr
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.tenant_id = $1 
         AND s.started_at >= NOW() - INTERVAL '${parseInt(months)} months'
       GROUP BY DATE_TRUNC('month', s.started_at)
       ORDER BY month DESC`,
            [tenantId]
        );

        return respond(res).success(result.rows);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/reports/revenue-by-plan
 */
const revenueByPlan = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT p.id AS plan_id, p.name AS plan_name, p.billing_cycle, p.price,
              COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active') AS active_subscriptions,
              COUNT(DISTINCT s.id) AS total_subscriptions,
              COALESCE(SUM(s.total_amount) FILTER (WHERE s.status = 'active'), 0) AS active_mrr,
              COALESCE(SUM(pmt.amount) FILTER (WHERE pmt.status = 'completed'), 0) AS total_revenue
       FROM plans p
       LEFT JOIN subscriptions s ON s.plan_id = p.id AND s.tenant_id = $1
       LEFT JOIN payments pmt ON pmt.subscription_id = s.id AND pmt.tenant_id = $1
       WHERE p.tenant_id = $1
       GROUP BY p.id, p.name, p.billing_cycle, p.price
       ORDER BY active_mrr DESC`,
            [req.tenantId]
        );
        return respond(res).success(result.rows);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/reports/outstanding-invoices
 */
const outstandingInvoices = async (req, res, next) => {
    try {
        const { buckets } = req.query;
        const tenantId = req.tenantId;

        const result = await db.query(
            `SELECT 
         i.id, i.invoice_number, i.issue_date, i.due_date, i.total_amount, i.amount_due, i.status,
         c.first_name || ' ' || c.last_name AS customer_name, c.email AS customer_email, c.company_name,
         CURRENT_DATE - i.due_date AS days_overdue,
         CASE 
           WHEN CURRENT_DATE <= i.due_date THEN 'current'
           WHEN CURRENT_DATE - i.due_date BETWEEN 1 AND 30 THEN '1-30 days'
           WHEN CURRENT_DATE - i.due_date BETWEEN 31 AND 60 THEN '31-60 days'
           WHEN CURRENT_DATE - i.due_date BETWEEN 61 AND 90 THEN '61-90 days'
           ELSE '90+ days'
         END AS aging_bucket
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       WHERE i.tenant_id = $1 AND i.status IN ('sent','overdue','partially_paid') AND i.amount_due > 0
       ORDER BY days_overdue DESC`,
            [tenantId]
        );

        // Summary by bucket
        const bucketSummary = result.rows.reduce((acc, inv) => {
            const b = inv.aging_bucket;
            if (!acc[b]) acc[b] = { count: 0, amount: 0 };
            acc[b].count++;
            acc[b].amount += parseFloat(inv.amount_due);
            return acc;
        }, {});

        return respond(res).success({
            invoices: result.rows,
            summary: bucketSummary,
            total_outstanding: result.rows.reduce((s, r) => s + parseFloat(r.amount_due), 0),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/reports/revenue-collection
 */
const revenueCollection = async (req, res, next) => {
    try {
        const { date_from, date_to } = req.query;
        const tenantId = req.tenantId;

        const result = await db.query(
            `SELECT
         TO_CHAR(payment_date, 'YYYY-MM-DD') AS date,
         COUNT(*) AS payment_count,
         SUM(amount) FILTER (WHERE status = 'completed') AS collected,
         SUM(amount) FILTER (WHERE status = 'failed') AS failed,
         SUM(refund_amount) AS refunded,
         json_object_agg(method, method_total) AS by_method
       FROM payments,
       LATERAL (SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS method_total) ma
       WHERE tenant_id = $1
         ${date_from ? `AND payment_date >= '${date_from}'` : ''}
         ${date_to ? `AND payment_date <= '${date_to}'` : ''}
       GROUP BY payment_date
       ORDER BY date DESC
       LIMIT 90`,
            [tenantId]
        );

        return respond(res).success(result.rows);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/reports/customer-retention
 */
const customerRetention = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;

        const result = await db.query(
            `SELECT
         TO_CHAR(DATE_TRUNC('month', started_at), 'YYYY-MM') AS cohort_month,
         COUNT(DISTINCT customer_id) AS customers_acquired,
         COUNT(DISTINCT customer_id) FILTER (WHERE status IN ('active', 'trial')) AS still_active,
         ROUND(
           100.0 * COUNT(DISTINCT customer_id) FILTER (WHERE status IN ('active', 'trial')) /
           NULLIF(COUNT(DISTINCT customer_id), 0), 2
         ) AS retention_rate
       FROM subscriptions
       WHERE tenant_id = $1
       GROUP BY DATE_TRUNC('month', started_at)
       ORDER BY cohort_month DESC
       LIMIT 12`,
            [tenantId]
        );

        return respond(res).success(result.rows);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/reports/tax-summary
 */
const taxSummary = async (req, res, next) => {
    try {
        const { date_from, date_to } = req.query;
        const tenantId = req.tenantId;

        let dateFilter = '';
        const params = [tenantId];
        let idx = 2;

        if (date_from) { dateFilter += ` AND i.issue_date >= $${idx++}`; params.push(date_from); }
        if (date_to) { dateFilter += ` AND i.issue_date <= $${idx++}`; params.push(date_to); }

        const result = await db.query(
            `SELECT
         it.tax_type, it.tax_name,
         AVG(it.tax_rate) AS avg_rate,
         SUM(it.taxable_amount) AS total_taxable,
         SUM(it.tax_amount) AS total_tax
       FROM invoice_taxes it
       JOIN invoices i ON it.invoice_id = i.id
       WHERE it.tenant_id = $1 AND i.status IN ('paid','partially_paid') ${dateFilter}
       GROUP BY it.tax_type, it.tax_name
       ORDER BY total_tax DESC`,
            params
        );

        const grandTotal = result.rows.reduce((s, r) => ({
            taxable: s.taxable + parseFloat(r.total_taxable),
            tax: s.tax + parseFloat(r.total_tax),
        }), { taxable: 0, tax: 0 });

        return respond(res).success({ breakdown: result.rows, totals: grandTotal });
    } catch (err) {
        next(err);
    }
};

module.exports = { dashboard, mrrReport, revenueByPlan, outstandingInvoices, revenueCollection, customerRetention, taxSummary };
