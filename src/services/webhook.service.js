const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Sign webhook payload with HMAC-SHA256
 */
const signPayload = (payload, secret) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const data = `${timestamp}.${JSON.stringify(payload)}`;
    const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');
    return { signature: `v1=${signature}`, timestamp };
};

/**
 * Deliver a single webhook
 */
const deliverWebhook = async (webhook, eventType, eventId, payload) => {
    const { signature, timestamp } = signPayload(payload, webhook.secret);
    const fullPayload = {
        id: eventId,
        event: eventType,
        created: timestamp,
        data: payload,
    };

    const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': eventType,
        'X-Webhook-ID': eventId,
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp.toString(),
        'User-Agent': 'SaaS-Billing-Platform/1.0',
        ...(webhook.headers || {}),
    };

    try {
        const response = await axios.post(webhook.url, fullPayload, {
            headers,
            timeout: (webhook.timeout_seconds || 30) * 1000,
            validateStatus: () => true, // Don't throw on non-2xx
        });

        const success = response.status >= 200 && response.status < 300;

        return {
            success,
            status_code: response.status,
            response_body: typeof response.data === 'string'
                ? response.data.substring(0, 1000)
                : JSON.stringify(response.data).substring(0, 1000),
        };
    } catch (err) {
        return {
            success: false,
            status_code: null,
            error: err.message,
        };
    }
};

/**
 * Fire a webhook event to all registered webhooks for a tenant
 */
const fire = async (tenantId, eventType, payload) => {
    try {
        // Get all active webhooks that listen to this event
        const result = await db.query(
            `SELECT * FROM webhooks 
       WHERE tenant_id = $1 AND is_active = true 
         AND $2 = ANY(events)`,
            [tenantId, eventType]
        );

        if (result.rows.length === 0) return;

        for (const webhook of result.rows) {
            const eventId = uuidv4();

            // Create log entry
            const logResult = await db.query(
                `INSERT INTO webhook_logs (id, webhook_id, tenant_id, event_type, event_id, payload, status, attempt_count)
         VALUES ($1,$2,$3,$4,$5,$6,'pending',0) RETURNING id`,
                [uuidv4(), webhook.id, tenantId, eventType, eventId, JSON.stringify(payload)]
            );
            const logId = logResult.rows[0].id;

            // Deliver asynchronously
            setImmediate(async () => {
                try {
                    const deliveryResult = await deliverWebhook(webhook, eventType, eventId, payload);

                    await db.query(
                        `UPDATE webhook_logs SET 
               status = $1, response_status = $2, response_body = $3,
               attempt_count = attempt_count + 1,
               delivered_at = $4, error_message = $5
             WHERE id = $6`,
                        [
                            deliveryResult.success ? 'delivered' : 'failed',
                            deliveryResult.status_code,
                            deliveryResult.response_body || deliveryResult.error,
                            deliveryResult.success ? new Date() : null,
                            deliveryResult.error || null,
                            logId,
                        ]
                    );

                    // Schedule retry if failed
                    if (!deliveryResult.success && webhook.retry_count > 0) {
                        const retryAt = new Date();
                        retryAt.setMinutes(retryAt.getMinutes() + 5); // First retry after 5 min
                        await db.query(
                            "UPDATE webhook_logs SET status = 'retrying', next_retry_at = $1 WHERE id = $2",
                            [retryAt, logId]
                        );
                    }

                    logger.debug('Webhook delivered', {
                        webhookId: webhook.id, eventType, success: deliveryResult.success,
                    });
                } catch (err) {
                    logger.error('Webhook delivery error', { webhookId: webhook.id, error: err.message });
                }
            });
        }
    } catch (err) {
        logger.error('Webhook fire error', { tenantId, eventType, error: err.message });
    }
};

/**
 * Retry failed webhook logs
 */
const retryFailed = async () => {
    try {
        const result = await db.query(
            `SELECT wl.*, w.url, w.secret, w.headers, w.timeout_seconds, w.retry_count
       FROM webhook_logs wl
       JOIN webhooks w ON wl.webhook_id = w.id
       WHERE wl.status = 'retrying' AND wl.next_retry_at <= NOW() AND wl.attempt_count < w.retry_count
       LIMIT 50`
        );

        for (const log of result.rows) {
            const deliveryResult = await deliverWebhook(
                { url: log.url, secret: log.secret, headers: log.headers, timeout_seconds: log.timeout_seconds },
                log.event_type, log.event_id, JSON.parse(log.payload)
            );

            const newAttemptCount = log.attempt_count + 1;
            const maxRetries = log.retry_count || 3;
            const isLastAttempt = newAttemptCount >= maxRetries;

            let nextRetryAt = null;
            if (!deliveryResult.success && !isLastAttempt) {
                nextRetryAt = new Date();
                nextRetryAt.setMinutes(nextRetryAt.getMinutes() + Math.pow(2, newAttemptCount) * 5);
            }

            await db.query(
                `UPDATE webhook_logs SET
           status = $1, response_status = $2, response_body = $3,
           attempt_count = $4, next_retry_at = $5,
           delivered_at = $6, error_message = $7
         WHERE id = $8`,
                [
                    deliveryResult.success ? 'delivered' : (isLastAttempt ? 'failed' : 'retrying'),
                    deliveryResult.status_code,
                    deliveryResult.response_body || deliveryResult.error,
                    newAttemptCount,
                    nextRetryAt,
                    deliveryResult.success ? new Date() : null,
                    deliveryResult.error || null,
                    log.id,
                ]
            );
        }

        if (result.rows.length > 0) {
            logger.info(`Webhook retry job: processed ${result.rows.length} retries`);
        }
    } catch (err) {
        logger.error('Webhook retry error', { error: err.message });
    }
};

module.exports = { fire, deliverWebhook, retryFailed };
