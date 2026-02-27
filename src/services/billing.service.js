const cron = require('node-cron');
const db = require('../database/connection');
const webhookService = require('./webhook.service');
const { getNextBillingDate, generateInvoiceNumber, calculateInvoiceTotals } = require('../utils/helpers');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Process subscriptions due for renewal billing
 */
const processRenewals = async () => {
    logger.info('Cron: Processing subscription renewals...');
    try {
        const result = await db.query(
            `SELECT s.*, p.name AS plan_name, p.billing_cycle, p.billing_interval,
              c.email AS customer_email, c.first_name, c.last_name, c.payment_terms,
              c.company_name, c.currency AS customer_currency
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       JOIN customers c ON s.customer_id = c.id
       WHERE s.status = 'active' 
         AND s.auto_renew = true
         AND s.next_billing_date <= NOW() + INTERVAL '1 day'`
        );

        logger.info(`Found ${result.rows.length} subscriptions due for renewal`);

        for (const sub of result.rows) {
            try {
                const invoiceNumber = await generateInvoiceNumber(sub.tenant_id);
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + (sub.payment_terms || 30));

                const items = [{
                    type: 'subscription',
                    description: `${sub.plan_name} - ${sub.billing_cycle} renewal`,
                    quantity: sub.quantity,
                    unit: 'period',
                    unit_price: sub.unit_amount,
                    discount_percent: sub.discount_percent || 0,
                    tax_rate: 18,
                }];
                const totals = calculateInvoiceTotals(items, sub.discount_percent || 0, [{ rate: 18 }]);
                const newPeriodEnd = getNextBillingDate(sub.current_period_end, sub.billing_cycle, sub.billing_interval || 1);

                await db.withTransaction(sub.tenant_id, async (client) => {
                    // Create renewal invoice
                    const invResult = await client.query(
                        `INSERT INTO invoices (id, tenant_id, customer_id, subscription_id, invoice_number, type,
               status, issue_date, due_date, billing_period_start, billing_period_end, currency,
               subtotal, discount_percent, discount_amount, taxable_amount, tax_amount, total_amount,
               amount_paid, amount_due)
             VALUES ($1,$2,$3,$4,$5,'invoice','draft',CURRENT_DATE,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,0,$15)
             RETURNING id`,
                        [
                            uuidv4(), sub.tenant_id, sub.customer_id, sub.id, invoiceNumber,
                            dueDate, sub.current_period_end, newPeriodEnd,
                            sub.customer_currency || 'INR',
                            totals.subtotal, sub.discount_percent || 0, totals.discount_amount,
                            totals.taxable_amount, totals.tax_amount, totals.total_amount,
                        ]
                    );

                    // Update subscription period
                    await client.query(
                        `UPDATE subscriptions SET 
               current_period_start = $1,
               current_period_end = $2,
               next_billing_date = $2,
               last_billed_at = NOW()
             WHERE id = $3`,
                        [sub.current_period_end, newPeriodEnd, sub.id]
                    );

                    await client.query(
                        `INSERT INTO subscription_history (id, subscription_id, tenant_id, event_type, to_plan_id, from_status, to_status)
             VALUES ($1,$2,$3,'renewed',$4,'active','active')`,
                        [uuidv4(), sub.id, sub.tenant_id, sub.plan_id]
                    );
                });

                await webhookService.fire(sub.tenant_id, 'invoice.created', { subscription_id: sub.id });
                logger.info(`Renewal invoice created for subscription ${sub.id}`);
            } catch (err) {
                logger.error(`Failed to renew subscription ${sub.id}`, { error: err.message });
            }
        }
    } catch (err) {
        logger.error('Renewal processing failed', { error: err.message });
    }
};

/**
 * Mark trial subscriptions as expired
 */
const processTrialExpiry = async () => {
    try {
        const result = await db.query(
            `UPDATE subscriptions 
       SET status = 'expired'
       WHERE status = 'trial' AND trial_ends_at < NOW()
       RETURNING id, tenant_id, customer_id`
        );

        for (const sub of result.rows) {
            await webhookService.fire(sub.tenant_id, 'subscription.expired', { subscription_id: sub.id });
        }

        if (result.rowCount > 0) {
            logger.info(`Expired ${result.rowCount} trial subscriptions`);
        }
    } catch (err) {
        logger.error('Trial expiry processing failed', { error: err.message });
    }
};

/**
 * Mark invoices as overdue
 */
const processOverdueInvoices = async () => {
    try {
        const result = await db.query(
            `UPDATE invoices SET status = 'overdue'
       WHERE status = 'sent' AND due_date < CURRENT_DATE
       RETURNING id, tenant_id, customer_id`
        );

        for (const inv of result.rows) {
            await webhookService.fire(inv.tenant_id, 'invoice.overdue', { invoice_id: inv.id });
        }

        if (result.rowCount > 0) {
            logger.info(`Marked ${result.rowCount} invoices as overdue`);
        }
    } catch (err) {
        logger.error('Overdue invoice processing failed', { error: err.message });
    }
};

/**
 * Refresh materialized views
 */
const refreshMaterializedViews = async () => {
    try {
        await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mrr_report');
        logger.debug('Refreshed MRR materialized view');
    } catch (err) {
        logger.error('Failed to refresh materialized views', { error: err.message });
    }
};

/**
 * Initialize all cron jobs
 */
const initCronJobs = () => {
    // Every day at 1 AM - process renewals
    cron.schedule('0 1 * * *', processRenewals, { name: 'renewals', timezone: 'Asia/Kolkata' });

    // Every day at 2 AM - check trial expiry  
    cron.schedule('0 2 * * *', processTrialExpiry, { name: 'trial-expiry', timezone: 'Asia/Kolkata' });

    // Every day at 3 AM - mark overdue invoices
    cron.schedule('0 3 * * *', processOverdueInvoices, { name: 'overdue-invoices', timezone: 'Asia/Kolkata' });

    // Every 5 minutes - retry failed webhooks
    cron.schedule('*/5 * * * *', webhookService.retryFailed, { name: 'webhook-retry' });

    // Every hour - refresh materialized views
    cron.schedule('0 * * * *', refreshMaterializedViews, { name: 'refresh-views' });

    logger.info('✅ Cron jobs initialized');
};

module.exports = { initCronJobs, processRenewals, processTrialExpiry, processOverdueInvoices };
