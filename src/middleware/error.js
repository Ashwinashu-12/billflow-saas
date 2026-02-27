const logger = require('../utils/logger');
const { AppError } = require('../utils/response');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errors = err.errors || null;

    // PostgreSQL errors
    if (err.code) {
        switch (err.code) {
            case '23505': // Unique constraint
                statusCode = 409;
                message = 'A record with this data already exists';
                const match = err.detail?.match(/\(([^)]+)\)=\(([^)]+)\)/);
                if (match) message = `Duplicate value for ${match[1]}: ${match[2]}`;
                break;
            case '23503': // Foreign key constraint
                statusCode = 400;
                message = 'Referenced record does not exist';
                break;
            case '23514': // Check constraint
                statusCode = 400;
                message = `Invalid value: ${err.detail || err.message}`;
                break;
            case '22001': // String too long
                statusCode = 400;
                message = 'Input value is too long';
                break;
            case '42703': // Column not found
                statusCode = 400;
                message = 'Invalid field in query';
                break;
            case 'ECONNREFUSED':
                statusCode = 503;
                message = 'Database connection failed';
                break;
        }
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token has expired';
    }

    // Validation errors
    if (err.name === 'ValidationError' && err.details) {
        statusCode = 400;
        errors = err.details.map(d => ({ field: d.path.join('.'), message: d.message }));
    }

    // Log the error
    if (statusCode >= 500) {
        logger.error('Server error', {
            message: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
            tenantId: req.tenantId,
            userId: req.user?.id,
            requestId: req.requestId,
        });
    } else if (statusCode >= 400) {
        logger.warn('Client error', {
            message,
            statusCode,
            path: req.path,
            method: req.method,
            tenantId: req.tenantId,
        });
    }

    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
    };

    if (errors) response.errors = errors;

    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
        response.code = err.code;
    }

    res.status(statusCode).json(response);
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.path}`,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Request ID middleware
 */
const requestId = (req, res, next) => {
    const { v4: uuidv4 } = require('uuid');
    req.requestId = req.headers['x-request-id'] || uuidv4();
    res.setHeader('X-Request-ID', req.requestId);
    next();
};

module.exports = { errorHandler, notFoundHandler, requestId };
