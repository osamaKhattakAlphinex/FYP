const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    console.error(err);

    // Sequelize unique constraint violation
    if (err.name === 'SequelizeUniqueConstraintError') {
        const field = err.errors && err.errors[0] && err.errors[0].path
            ? err.errors[0].path
            : 'Field';
        const label = field.charAt(0).toUpperCase() + field.slice(1);
        error = new ErrorResponse(`${label} already exists`, 400);
    }

    // Sequelize validation error
    if (err.name === 'SequelizeValidationError') {
        const message = err.errors.map((e) => e.message).join(', ');
        error = new ErrorResponse(message, 400);
    }

    // Sequelize foreign key violation
    if (err.name === 'SequelizeForeignKeyConstraintError') {
        error = new ErrorResponse('Invalid reference to related resource', 400);
    }

    // Sequelize database error (bad column/type/etc.)
    if (err.name === 'SequelizeDatabaseError') {
        error = new ErrorResponse('Database error', 500);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error = new ErrorResponse('Invalid token', 401);
    }
    if (err.name === 'TokenExpiredError') {
        error = new ErrorResponse('Token expired', 401);
    }

    const message = error.message || 'Server Error';
    res.status(error.statusCode || 500).json({
        success: false,
        message,
        // `error` kept for backward compatibility with older callers
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
