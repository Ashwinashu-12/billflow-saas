const { v4: uuidv4 } = require('uuid');
const db = require('../database/connection');

/**
 * Generate next invoice number for a tenant
 */
const generateInvoiceNumber = async (tenantId) => {
    const prefix = process.env.INVOICE_PREFIX || 'INV';
    const result = await db.query(
        `SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(invoice_number, '[^0-9]', '', 'g') AS INTEGER)), 999) + 1 AS next_num
     FROM invoices WHERE tenant_id = $1`,
        [tenantId]
    );
    const nextNum = result.rows[0].next_num;
    return `${prefix}-${String(nextNum).padStart(6, '0')}`;
};

/**
 * Generate next payment number for a tenant
 */
const generatePaymentNumber = async (tenantId) => {
    const result = await db.query(
        `SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(payment_number, '[^0-9]', '', 'g') AS INTEGER)), 999) + 1 AS next_num
     FROM payments WHERE tenant_id = $1`,
        [tenantId]
    );
    const nextNum = result.rows[0].next_num;
    return `PAY-${String(nextNum).padStart(6, '0')}`;
};

/**
 * Generate customer code
 */
const generateCustomerCode = async (tenantId) => {
    const result = await db.query(
        `SELECT COUNT(*) + 1 AS next_num FROM customers WHERE tenant_id = $1`,
        [tenantId]
    );
    const nextNum = result.rows[0].next_num;
    return `CUST-${String(nextNum).padStart(4, '0')}`;
};

/**
 * Calculate next billing date
 */
const getNextBillingDate = (fromDate, billingCycle, interval = 1) => {
    const date = new Date(fromDate);
    switch (billingCycle) {
        case 'monthly':
            date.setMonth(date.getMonth() + interval);
            break;
        case 'yearly':
            date.setFullYear(date.getFullYear() + interval);
            break;
        case 'quarterly':
            date.setMonth(date.getMonth() + 3 * interval);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7 * interval);
            break;
        default:
            date.setMonth(date.getMonth() + interval);
    }
    return date;
};

/**
 * Calculate GST breakdown based on customer state
 */
const calculateGST = (amount, gstRate, tenantState, customerState) => {
    const isSameState = tenantState === customerState;
    const taxAmount = (amount * gstRate) / 100;

    if (isSameState) {
        return {
            cgst: { rate: gstRate / 2, amount: taxAmount / 2 },
            sgst: { rate: gstRate / 2, amount: taxAmount / 2 },
            igst: null,
            total: taxAmount,
        };
    } else {
        return {
            cgst: null,
            sgst: null,
            igst: { rate: gstRate, amount: taxAmount },
            total: taxAmount,
        };
    }
};

/**
 * Format currency
 */
const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amount);
};

/**
 * Calculate invoice totals from items
 */
const calculateInvoiceTotals = (items, discountPercent = 0, taxRules = []) => {
    const subtotal = items.reduce((sum, item) => {
        const itemAmount = item.quantity * item.unit_price;
        const itemDiscount = (itemAmount * (item.discount_percent || 0)) / 100;
        return sum + itemAmount - itemDiscount;
    }, 0);

    const discountAmount = (subtotal * discountPercent) / 100;
    const taxableAmount = subtotal - discountAmount;

    const taxAmount = taxRules.reduce((sum, rule) => {
        return sum + (taxableAmount * rule.rate) / 100;
    }, 0);

    const totalAmount = taxableAmount + taxAmount;

    return {
        subtotal: Math.round(subtotal * 100) / 100,
        discount_amount: Math.round(discountAmount * 100) / 100,
        taxable_amount: Math.round(taxableAmount * 100) / 100,
        tax_amount: Math.round(taxAmount * 100) / 100,
        total_amount: Math.round(totalAmount * 100) / 100,
    };
};

/**
 * Parse pagination query params
 */
const parsePagination = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
    return { page, limit };
};

/**
 * Build sort clause
 */
const buildSortClause = (sortBy, sortOrder, allowedFields, tableAlias = '') => {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    if (!allowedFields.includes(sortBy)) {
        sortBy = allowedFields[0];
    }
    sortOrder = ['ASC', 'DESC'].includes(sortOrder?.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
    return `${prefix}${sortBy} ${sortOrder}`;
};

/**
 * Sanitize object - remove undefined/null values
 */
const sanitizeObject = (obj) => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    );
};

/**
 * Sleep utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Chunk array into batches
 */
const chunkArray = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};

/**
 * Generate random string
 */
const generateRandomString = (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Mask sensitive data
 */
const maskEmail = (email) => {
    const [local, domain] = email.split('@');
    return `${local.substring(0, 2)}***@${domain}`;
};

module.exports = {
    generateInvoiceNumber,
    generatePaymentNumber,
    generateCustomerCode,
    getNextBillingDate,
    calculateGST,
    formatCurrency,
    calculateInvoiceTotals,
    parsePagination,
    buildSortClause,
    sanitizeObject,
    sleep,
    chunkArray,
    generateRandomString,
    maskEmail,
};
