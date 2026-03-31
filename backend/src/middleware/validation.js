const {
    body,
    validationResult
} = require('express-validator');

// Validation middleware
exports.validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    }
    next();
};

// Registration validation rules
exports.registerValidation = [
    body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
    body('password')
    .isLength({
        min: 6
    })
    .withMessage('Password must be at least 6 characters'),
    body('role')
    .isIn(['student', 'company', 'admin'])
    .withMessage('Invalid role'),
    body('firstName')
    .optional()
    .trim()
    .isLength({
        min: 2
    })
    .withMessage('First name must be at least 2 characters'),
    body('lastName')
    .optional()
    .trim()
    .isLength({
        min: 2
    })
    .withMessage('Last name must be at least 2 characters'),
    body('companyName')
    .optional()
    .trim()
    .isLength({
        min: 2
    })
    .withMessage('Company name must be at least 2 characters')
];

// Login validation rules
exports.loginValidation = [
    body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
    body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Email validation rules
exports.emailValidation = [
    body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

// Password validation rules
exports.passwordValidation = [
    body('password')
    .isLength({
        min: 6
    })
    .withMessage('Password must be at least 6 characters')
];

// OTP validation rules
exports.otpValidation = [
    body('otp')
    .isLength({
        min: 6,
        max: 6
    })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number')
];

// Reset password validation rules
exports.resetPasswordValidation = [
    body('password')
    .isLength({
        min: 6
    })
    .withMessage('Password must be at least 6 characters'),
    body('confirmPassword')
    .custom((value, {
        req
    }) => value === req.body.password)
    .withMessage('Passwords do not match')
];