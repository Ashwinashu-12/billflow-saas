const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Multi-Tenant SaaS Billing Platform API',
            version: '1.0.0',
            description: `
## Multi-Tenant Subscription Billing Platform

A production-ready SaaS billing platform with:
- **Multi-Tenant Architecture** with strict data isolation
- **Role-Based Access Control** (Owner, Admin, Accountant, Viewer)
- **Customer Management** with GST/tax details
- **Subscription Plans** with flexible pricing tiers
- **Recurring Invoice Generation** with PDF export
- **Payment Tracking** with partial payments and refunds
- **Usage-Based Billing** with metric aggregation
- **GST/Tax Engine** (CGST/SGST/IGST support)
- **Reports Dashboard** (MRR, ARR, Churn, Retention)
- **Webhook System** with retry logic
- **Audit Logging** for all financial actions

## Authentication
Use JWT Bearer token in the Authorization header:
\`Authorization: Bearer <your_token>\`

## Demo Account
- **Owner:** owner@acmecorp.com / Demo@123456
- **Admin:** admin@acmecorp.com / Demo@123456
- **Accountant:** accountant@acmecorp.com / Demo@123456
- **Viewer:** viewer@acmecorp.com / Demo@123456
      `,
            contact: {
                name: 'API Support',
                email: 'support@saas-billing.com',
            },
            license: {
                name: 'MIT',
            },
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 5000}/api/v1`,
                description: 'Development Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                Tenant: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'Acme Corp Solutions' },
                        slug: { type: 'string', example: 'acme-corp' },
                        email: { type: 'string', format: 'email' },
                        currency: { type: 'string', example: 'INR' },
                        timezone: { type: 'string', example: 'Asia/Kolkata' },
                        plan_tier: { type: 'string', enum: ['starter', 'growth', 'enterprise'] },
                    },
                },
                Customer: {
                    type: 'object',
                    required: ['first_name', 'last_name', 'email'],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        code: { type: 'string', example: 'CUST-0001' },
                        company_name: { type: 'string', example: 'TechStart Ltd' },
                        first_name: { type: 'string', example: 'Rahul' },
                        last_name: { type: 'string', example: 'Sharma' },
                        email: { type: 'string', format: 'email' },
                        status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'churned'] },
                    },
                },
                Plan: {
                    type: 'object',
                    required: ['name', 'code', 'billing_cycle', 'price'],
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'Growth' },
                        code: { type: 'string', example: 'GROWTH' },
                        billing_cycle: { type: 'string', enum: ['monthly', 'yearly', 'quarterly', 'weekly', 'one_time'] },
                        price: { type: 'number', example: 2999 },
                        trial_days: { type: 'integer', example: 14 },
                    },
                },
                Subscription: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        customer_id: { type: 'string', format: 'uuid' },
                        plan_id: { type: 'string', format: 'uuid' },
                        status: { type: 'string', enum: ['trial', 'active', 'past_due', 'paused', 'cancelled', 'expired'] },
                        total_amount: { type: 'number' },
                        next_billing_date: { type: 'string', format: 'date-time' },
                    },
                },
                Invoice: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        invoice_number: { type: 'string', example: 'INV-001000' },
                        status: { type: 'string', enum: ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'void'] },
                        total_amount: { type: 'number' },
                        amount_due: { type: 'number' },
                        due_date: { type: 'string', format: 'date' },
                    },
                },
                Payment: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        payment_number: { type: 'string', example: 'PAY-001000' },
                        method: { type: 'string', enum: ['bank_transfer', 'upi', 'credit_card', 'cheque', 'cash'] },
                        status: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded'] },
                        amount: { type: 'number' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        errors: { type: 'array', items: { type: 'object' } },
                    },
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        pages: { type: 'integer' },
                        hasNext: { type: 'boolean' },
                        hasPrev: { type: 'boolean' },
                    },
                },
            },
            responses: {
                UnauthorizedError: {
                    description: 'Authentication information is missing or invalid',
                    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
                },
                ForbiddenError: {
                    description: 'Insufficient permissions',
                    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
                },
                NotFoundError: {
                    description: 'Resource not found',
                    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
                },
                ValidationError: {
                    description: 'Validation failed',
                    content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } },
                },
            },
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Authentication', description: 'Auth endpoints' },
            { name: 'Customers', description: 'Customer management' },
            { name: 'Plans', description: 'Subscription plan management' },
            { name: 'Subscriptions', description: 'Subscription lifecycle' },
            { name: 'Invoices', description: 'Invoice management and PDF generation' },
            { name: 'Payments', description: 'Payment tracking and refunds' },
            { name: 'Usage', description: 'Usage-based billing and metrics' },
            { name: 'Reports', description: 'Revenue and analytics reports' },
            { name: 'Webhooks', description: 'Webhook management' },
            { name: 'Audit', description: 'Audit log access' },
        ],
    },
    apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

module.exports = swaggerJsdoc(options);
