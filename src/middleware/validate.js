const { validationResult } = require('express-validator');
const Joi = require('joi');
const { ValidationError } = require('../utils/response');

/**
 * Validate using express-validator
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(e => ({
            field: e.path || e.param,
            message: e.msg,
        }));
        return next(new ValidationError('Validation failed', formattedErrors));
    }
    next();
};

/**
 * Joi schema validation middleware factory
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const data = source === 'query' ? req.query : source === 'params' ? req.params : req.body;
        const { error, value } = schema.validate(data, {
            abortEarly: false,
            allowUnknown: false,
            stripUnknown: true,
        });

        if (error) {
            const errors = error.details.map(d => ({
                field: d.path.join('.'),
                message: d.message.replace(/['"]/g, ''),
            }));
            return next(new ValidationError('Validation failed', errors));
        }

        // Replace with validated/sanitized value
        if (source === 'query') req.query = value;
        else if (source === 'params') req.params = value;
        else req.body = value;

        next();
    };
};

// ─── Common Schemas ──────────────────────────────────────────────────────────

const uuidSchema = Joi.string().uuid({ version: 'uuidv4' });

const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort_by: Joi.string().max(50),
    sort_order: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC'),
    search: Joi.string().max(100).allow(''),
}).options({ allowUnknown: true });

const registerTenantSchema = Joi.object({
    name: Joi.string().min(2).max(255).required(),
    slug: Joi.string().min(2).max(100).lowercase().pattern(/^[a-z0-9-]+$/).required()
        .messages({ 'string.pattern.base': 'Slug can only contain lowercase letters, numbers, and hyphens' }),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(100)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({ 'string.pattern.base': 'Password must have uppercase, lowercase, number and special char' }),
    phone: Joi.string().max(20).allow('', null),
    website: Joi.string().uri().allow('', null),
    first_name: Joi.string().min(1).max(100).required(),
    last_name: Joi.string().min(1).max(100).required(),
    currency: Joi.string().length(3).default('INR'),
    timezone: Joi.string().max(50).default('Asia/Kolkata'),
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    tenant_slug: Joi.string().max(100).allow('', null),
});

const customerSchema = Joi.object({
    company_name: Joi.string().max(255).allow('', null),
    first_name: Joi.string().min(1).max(100).required(),
    last_name: Joi.string().min(1).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().max(20).allow('', null),
    mobile: Joi.string().max(20).allow('', null),
    website: Joi.string().uri().allow('', null),
    currency: Joi.string().length(3).default('INR'),
    payment_terms: Joi.number().integer().min(0).max(365).default(30),
    credit_limit: Joi.number().min(0).default(0),
    source: Joi.string().max(100).allow('', null),
    notes: Joi.string().max(1000).allow('', null),
    tags: Joi.array().items(Joi.string().max(50)).default([]),
    // Nested
    billing_address: Joi.object({
        address_line1: Joi.string().max(255).required(),
        address_line2: Joi.string().max(255).allow('', null),
        city: Joi.string().max(100).required(),
        state: Joi.string().max(100).required(),
        country: Joi.string().max(100).default('India'),
        postal_code: Joi.string().max(20).required(),
    }).allow(null),
    tax_details: Joi.object({
        gstin: Joi.string().max(20).allow('', null),
        pan: Joi.string().max(20).allow('', null),
        tax_category: Joi.string().valid('regular', 'composition', 'unregistered', 'sez', 'overseas').default('regular'),
        state_code: Joi.string().max(5).allow('', null),
    }).allow(null),
});

const planSchema = Joi.object({
    name: Joi.string().min(2).max(255).required(),
    code: Joi.string().min(2).max(50).uppercase().pattern(/^[A-Z0-9-_]+$/).required(),
    description: Joi.string().max(1000).allow('', null),
    billing_cycle: Joi.string().valid('monthly', 'yearly', 'quarterly', 'weekly', 'one_time').required(),
    billing_interval: Joi.number().integer().min(1).default(1),
    price: Joi.number().min(0).required(),
    currency: Joi.string().length(3).default('INR'),
    trial_days: Joi.number().integer().min(0).default(0),
    setup_fee: Joi.number().min(0).default(0),
    max_users: Joi.number().integer().allow(null),
    max_storage_gb: Joi.number().integer().allow(null),
    max_api_calls: Joi.number().integer().allow(null),
    features: Joi.array().items(Joi.object({
        name: Joi.string().required(),
        key: Joi.string().required(),
        value: Joi.string().allow('', null),
        is_enabled: Joi.boolean().default(true),
    })).default([]),
    usage_pricing: Joi.array().items(Joi.object({
        metric_name: Joi.string().required(),
        metric_key: Joi.string().required(),
        unit_name: Joi.string().allow('', null),
        unit_price: Joi.number().min(0).required(),
        included_units: Joi.number().integer().min(0).default(0),
    })).default([]),
});

const subscriptionSchema = Joi.object({
    customer_id: uuidSchema.required(),
    plan_id: uuidSchema.required(),
    quantity: Joi.number().integer().min(1).default(1),
    discount_percent: Joi.number().min(0).max(100).default(0),
    start_date: Joi.date().iso().allow(null),
    notes: Joi.string().max(1000).allow('', null),
    auto_renew: Joi.boolean().default(true),
});

const invoiceSchema = Joi.object({
    customer_id: uuidSchema.required(),
    subscription_id: uuidSchema.allow(null),
    type: Joi.string().valid('invoice', 'credit_note', 'proforma').default('invoice'),
    issue_date: Joi.date().iso().default(() => new Date()),
    due_date: Joi.date().iso().required(),
    billing_period_start: Joi.date().iso().allow(null),
    billing_period_end: Joi.date().iso().allow(null),
    reference_number: Joi.string().max(100).allow('', null),
    po_number: Joi.string().max(100).allow('', null),
    currency: Joi.string().length(3).default('INR'),
    discount_percent: Joi.number().min(0).max(100).default(0),
    notes: Joi.string().max(2000).allow('', null),
    terms: Joi.string().max(2000).allow('', null),
    items: Joi.array().items(Joi.object({
        type: Joi.string().valid('subscription', 'usage', 'one_time', 'discount').default('one_time'),
        description: Joi.string().max(500).required(),
        quantity: Joi.number().min(0).required(),
        unit: Joi.string().max(50).allow('', null),
        unit_price: Joi.number().min(0).required(),
        discount_percent: Joi.number().min(0).max(100).default(0),
        tax_rate: Joi.number().min(0).max(100).default(18),
        period_start: Joi.date().iso().allow(null),
        period_end: Joi.date().iso().allow(null),
    })).min(1).required(),
    tax_rules: Joi.array().items(Joi.object({
        tax_name: Joi.string().required(),
        tax_type: Joi.string().valid('CGST', 'SGST', 'IGST', 'UTGST', 'Cess', 'Other').required(),
        tax_rate: Joi.number().min(0).max(100).required(),
        taxable_amount: Joi.number().min(0).required(),
    })).default([]),
});

const paymentSchema = Joi.object({
    invoice_id: uuidSchema.allow(null),
    customer_id: uuidSchema.required(),
    subscription_id: uuidSchema.allow(null),
    method: Joi.string().valid('bank_transfer', 'credit_card', 'debit_card', 'upi', 'cheque', 'cash', 'wallet', 'net_banking', 'other').required(),
    gateway: Joi.string().max(100).allow('', null),
    gateway_payment_id: Joi.string().max(255).allow('', null),
    amount: Joi.number().min(0.01).required(),
    currency: Joi.string().length(3).default('INR'),
    fees: Joi.number().min(0).default(0),
    reference_number: Joi.string().max(255).allow('', null),
    cheque_number: Joi.string().max(100).allow('', null),
    bank_name: Joi.string().max(255).allow('', null),
    payment_date: Joi.date().iso().default(() => new Date()),
    notes: Joi.string().max(1000).allow('', null),
});

const usageLogSchema = Joi.object({
    customer_id: uuidSchema.required(),
    subscription_id: uuidSchema.required(),
    metric_key: Joi.string().max(100).required(),
    metric_name: Joi.string().max(255).required(),
    quantity: Joi.number().min(0).required(),
    unit: Joi.string().max(50).allow('', null),
    recorded_at: Joi.date().iso().default(() => new Date()),
    metadata: Joi.object().default({}),
});

const webhookSchema = Joi.object({
    name: Joi.string().min(2).max(255).required(),
    url: Joi.string().uri().required(),
    events: Joi.array().items(Joi.string().max(100)).min(1).required(),
    retry_count: Joi.number().integer().min(0).max(10).default(3),
    timeout_seconds: Joi.number().integer().min(5).max(120).default(30),
    headers: Joi.object().default({}),
});

module.exports = {
    validate,
    handleValidationErrors,
    schemas: {
        pagination: paginationSchema,
        registerTenant: registerTenantSchema,
        login: loginSchema,
        customer: customerSchema,
        plan: planSchema,
        subscription: subscriptionSchema,
        invoice: invoiceSchema,
        payment: paymentSchema,
        usageLog: usageLogSchema,
        webhook: webhookSchema,
    },
};
