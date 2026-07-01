const jwt = require('jsonwebtoken');
const { User } = require('../models');
const ErrorResponse = require('../utils/errorResponse');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return next(new ErrorResponse('Not authorized to access this route', 401));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findByPk(decoded.id);

            if (!req.user) return next(new ErrorResponse('User not found', 404));
            if (!req.user.isActive) return next(new ErrorResponse('Account has been deactivated', 403));

            next();
        } catch (error) {
            return next(new ErrorResponse('Not authorized to access this route', 401));
        }
    } catch (error) {
        next(error);
    }
};

// Optional auth - decode the token if one is present, but never block the
// request when it's missing/invalid. Used on public routes that personalise
// their response for a logged-in user (e.g. AI match scores on task listings).
exports.optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) return next();

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findByPk(decoded.id);
            if (user && user.isActive) req.user = user;
        } catch (error) {
            // Invalid/expired token on a public route — treat as anonymous.
        }

        next();
    } catch (error) {
        next();
    }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new ErrorResponse(
                    `User role '${req.user.role}' is not authorized to access this route`,
                    403
                )
            );
        }
        next();
    };
};

// Check if email is verified
exports.verifyEmail = (req, res, next) => {
    if (!req.user.isEmailVerified) {
        return next(new ErrorResponse('Please verify your email to access this resource', 403));
    }
    next();
};
