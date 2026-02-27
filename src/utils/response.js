/**
 * Standard API Response Helpers
 */

class ApiResponse {
    constructor(res) {
        this.res = res;
    }

    success(data, message = 'Success', statusCode = 200) {
        return this.res.status(statusCode).json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString(),
        });
    }

    created(data, message = 'Created successfully') {
        return this.success(data, message, 201);
    }

    paginated(data, pagination, message = 'Success') {
        return this.res.status(200).json({
            success: true,
            message,
            data,
            pagination,
            timestamp: new Date().toISOString(),
        });
    }

    error(message, statusCode = 500, errors = null) {
        const response = {
            success: false,
            message,
            timestamp: new Date().toISOString(),
        };
        if (errors) response.errors = errors;
        return this.res.status(statusCode).json(response);
    }

    notFound(resource = 'Resource') {
        return this.error(`${resource} not found`, 404);
    }

    unauthorized(message = 'Unauthorized access') {
        return this.error(message, 401);
    }

    forbidden(message = 'Forbidden') {
        return this.error(message, 403);
    }

    badRequest(message, errors = null) {
        return this.error(message, 400, errors);
    }

    conflict(message) {
        return this.error(message, 409);
    }

    noContent() {
        return this.res.status(204).send();
    }
}

// Factory function
const respond = (res) => new ApiResponse(res);

// Standard error classes
class AppError extends Error {
    constructor(message, statusCode = 500, errors = null) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, errors = null) {
        super(message, 400, errors);
        this.name = 'ValidationError';
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404);
        this.name = 'NotFoundError';
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
        this.name = 'UnauthorizedError';
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403);
        this.name = 'ForbiddenError';
    }
}

class ConflictError extends AppError {
    constructor(message) {
        super(message, 409);
        this.name = 'ConflictError';
    }
}

module.exports = {
    respond,
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
};
