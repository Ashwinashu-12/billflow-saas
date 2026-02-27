require('express-async-errors');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

const logger = require('./utils/logger');
const { testConnection } = require('./database/connection');
const { errorHandler, notFoundHandler, requestId } = require('./middleware/error');
const { initCronJobs } = require('./services/billing.service');
const swaggerSpec = require('./config/swagger');

// Routes
const authRoutes = require('./routes/auth.routes');
const customerRoutes = require('./routes/customer.routes');
const planRoutes = require('./routes/plan.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const paymentRoutes = require('./routes/payment.routes');
const { usageRouter, reportRouter, auditRouter, webhookRouter } = require('./routes/index.routes');

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.APP_URL || `http://localhost:${PORT}`;

/* ======================= Middleware ======================= */

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(requestId);

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', {
        stream: { write: (msg) => logger.info(msg.trim()) },
    }));
}

const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
});
app.use(limiter);

/* ======================= Health ======================= */

app.get('/health', async (req, res) => {
    const dbConnected = await testConnection();
    res.status(dbConnected ? 200 : 503).json({
        status: dbConnected ? 'ok' : 'degraded',
        environment: process.env.NODE_ENV
    });
});

/* ======================= Swagger ======================= */

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

/* ======================= Routes ======================= */

const apiV1 = express.Router();

apiV1.use('/auth', authRoutes);
apiV1.use('/customers', customerRoutes);
apiV1.use('/plans', planRoutes);
apiV1.use('/subscriptions', subscriptionRoutes);
apiV1.use('/invoices', invoiceRoutes);
apiV1.use('/payments', paymentRoutes);
apiV1.use('/usage', usageRouter);
apiV1.use('/reports', reportRouter);
apiV1.use('/audit', auditRouter);
apiV1.use('/webhooks', webhookRouter);

apiV1.get('/', (req, res) => {
    res.json({
        name: 'Multi-Tenant SaaS Billing Platform',
        version: '1.0.0',
        docs: `${BASE_URL}/api-docs`,
        health: `${BASE_URL}/health`
    });
});

app.use('/api/v1', apiV1);

app.get('/', (req, res) => {
    res.redirect('/api/v1');
});

/* ======================= Errors ======================= */

app.use(notFoundHandler);
app.use(errorHandler);

/* ======================= Start Server ======================= */

const start = async () => {
    try {

        // Create required directories
        const dirs = ['./storage/pdfs', './logs'];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });

        // Start server FIRST (important for Render)
        app.listen(PORT, async () => {

            logger.info(`Server running on port ${PORT}`);

            // Then test DB (don't crash app)
            const dbOk = await testConnection();
            if (!dbOk) {
                logger.error('Database connection failed.');
            } else {
                logger.info('Database connected successfully.');
            }

            if (process.env.NODE_ENV !== 'test') {
                initCronJobs();
            }
        });

    } catch (err) {
        logger.error('Failed to start server', { error: err.message });
    }
};

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message });
});

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason });
});

start();

module.exports = app;