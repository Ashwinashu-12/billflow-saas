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

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false, // Allow Swagger UI
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Tenant-ID'],
    credentials: true,
}));

app.use(compression());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID
app.use(requestId);

// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', {
        stream: { write: (msg) => logger.info(msg.trim()) },
    }));
}

// Global Rate Limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later' },
    skip: (req) => req.path.startsWith('/api-docs'), // Don't rate limit API docs
});
app.use(limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many auth attempts' },
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
    const dbConnected = await testConnection();
    res.status(dbConnected ? 200 : 503).json({
        status: dbConnected ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        services: {
            database: dbConnected ? 'connected' : 'disconnected',
        },
    });
});

// ─── API Docs ─────────────────────────────────────────────────────────────────
const swaggerOptions = {
    customCss: `
    .swagger-ui .topbar { background-color: #1E293B; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
    .swagger-ui .info .title { color: #2563EB; }
    .swagger-ui .scheme-container { background: #F1F5F9; padding: 1rem; border-radius: 8px; }
  `,
    customSiteTitle: 'SaaS Billing API Docs',
    customfavIcon: '',
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
    },
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// ─── API Routes ───────────────────────────────────────────────────────────────
const apiV1 = express.Router();

apiV1.use('/auth', authLimiter, authRoutes);
apiV1.use('/customers', customerRoutes);
apiV1.use('/plans', planRoutes);
apiV1.use('/subscriptions', subscriptionRoutes);
apiV1.use('/invoices', invoiceRoutes);
apiV1.use('/payments', paymentRoutes);
apiV1.use('/usage', usageRouter);
apiV1.use('/reports', reportRouter);
apiV1.use('/audit', auditRouter);
apiV1.use('/webhooks', webhookRouter);

// API info endpoint
apiV1.get('/', (req, res) => {
    res.json({
        name: 'Multi-Tenant SaaS Billing Platform',
        version: '1.0.0',
        docs: `http://localhost:${PORT}/api-docs`,
        health: `http://localhost:${PORT}/health`,
        endpoints: {
            auth: '/api/v1/auth',
            customers: '/api/v1/customers',
            plans: '/api/v1/plans',
            subscriptions: '/api/v1/subscriptions',
            invoices: '/api/v1/invoices',
            payments: '/api/v1/payments',
            usage: '/api/v1/usage',
            reports: '/api/v1/reports',
            audit: '/api/v1/audit',
            webhooks: '/api/v1/webhooks',
        },
    });
});

app.use('/api/v1', apiV1);

// Root Endpoint
app.get('/', (req, res) => {
    res.redirect('/api/v1');
});


// ─── Error Handlers ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const start = async () => {
    try {
        // Test DB connection
        const dbOk = await testConnection();
        if (!dbOk) {
            logger.error('Database connection failed. Exiting.');
            process.exit(1);
        }

        // Ensure storage directories exist
        const dirs = ['./storage/pdfs', './logs'];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });

        // Initialize background jobs
        if (process.env.NODE_ENV !== 'test') {
            initCronJobs();
        }

        app.listen(PORT, () => {
            logger.info(`\n
╔═══════════════════════════════════════════════════════╗
║      Multi-Tenant SaaS Billing Platform               ║
║                                                       ║
║  🚀  Server running at: http://localhost:${PORT}        ║
║  📚  API Docs at: http://localhost:${PORT}/api-docs    ║
║  🏥  Health: http://localhost:${PORT}/health           ║
║  🌍  Environment: ${process.env.NODE_ENV}                   ║
╚═══════════════════════════════════════════════════════╝
      `);
        });
    } catch (err) {
        logger.error('Failed to start server', { error: err.message });
        process.exit(1);
    }
};

// Handle uncaught errors
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason });
    process.exit(1);
});

start();

module.exports = app;
