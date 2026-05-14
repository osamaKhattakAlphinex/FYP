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
        .optional({
            values: 'falsy'
        })
        .trim()
        .isLength({
            min: 2
        })
        .withMessage('First name must be at least 2 characters'),
    body('lastName')
        .optional({
            values: 'falsy'
        })
        .trim()
        .isLength({
            min: 2
        })
        .withMessage('Last name must be at least 2 characters'),
    body('companyName')
        .optional({
            values: 'falsy'
        })
        .trim()
        .isLength({
            min: 2
        })
        .withMessage('Company name must be at least 2 characters'),
    body('industry')
        .optional({
            values: 'falsy'
        })
        .trim()
        .notEmpty()
        .withMessage('Industry is required for companies'),
    body('companySize')
        .optional({
            values: 'falsy'
        })
        .trim()
        .notEmpty()
        .withMessage('Company size is required for companies'),
    body('website')
        .optional({
            values: 'falsy'
        })
        .trim()
        .isURL()
        .withMessage('Please provide a valid URL'),
    body('phone')
        .optional({
            values: 'falsy'
        })
        .trim()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number')
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

// Task creation validation rules
exports.validateTaskCreation = [
    body('title')
        .trim()
        .isLength({
            min: 5,
            max: 100
        })
        .withMessage('Title must be between 5 and 100 characters'),
    body('description')
        .trim()
        .isLength({
            min: 50,
            max: 5000
        })
        .withMessage('Description must be between 50 and 5000 characters'),
    body('category')
        .isIn([
            'Web Development',
            'Mobile Development',
            'UI/UX Design',
            'Data Science',
            'Machine Learning',
            'Digital Marketing',
            'Content Writing',
            'Graphic Design',
            'Video Editing',
            'Business Analysis',
            'Quality Assurance',
            'DevOps',
            'Cybersecurity',
            'Other'
        ])
        .withMessage('Invalid category'),
    body('type')
        .isIn(['internship', 'project', 'freelance'])
        .withMessage('Invalid task type'),
    body('duration.value')
        .isInt({
            min: 1,
            max: 52
        })
        .withMessage('Duration value must be between 1 and 52'),
    body('duration.unit')
        .isIn(['days', 'weeks', 'months'])
        .withMessage('Duration unit must be days, weeks, or months'),
    body('workType')
        .isIn(['remote', 'onsite', 'hybrid'])
        .withMessage('Invalid work type'),
    body('experienceLevel')
        .isIn(['entry', 'intermediate', 'expert'])
        .withMessage('Invalid experience level'),
    body('skillsRequired')
        .isArray({
            min: 1
        })
        .withMessage('At least one skill is required'),
    body('skillsRequired.*.name')
        .trim()
        .notEmpty()
        .withMessage('Skill name is required'),
    body('skillsRequired.*.level')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced'])
        .withMessage('Invalid skill level'),
    body('budget.type')
        .isIn(['fixed', 'hourly', 'unpaid'])
        .withMessage('Invalid budget type'),
    body('budget.amount.min')
        .optional()
        .isFloat({
            min: 0
        })
        .withMessage('Minimum budget must be a positive number'),
    body('budget.amount.max')
        .optional()
        .isFloat({
            min: 0
        })
        .withMessage('Maximum budget must be a positive number'),
    body('applicationDeadline')
        .isISO8601()
        .custom((value) => {
            const deadline = new Date(value);
            const now = new Date();
            const minDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

            if (deadline <= minDeadline) {
                throw new Error('Application deadline must be at least 24 hours from now');
            }
            return true;
        }),
    body('startDate')
        .isISO8601()
        .custom((value, {
            req
        }) => {
            const startDate = new Date(value);
            const deadline = new Date(req.body.applicationDeadline);

            if (startDate <= deadline) {
                throw new Error('Start date must be after application deadline');
            }
            return true;
        }),
    body('maxApplications')
        .optional()
        .isInt({
            min: 1,
            max: 1000
        })
        .withMessage('Max applications must be between 1 and 1000'),
    exports.validate
];

// Task update validation rules
exports.validateTaskUpdate = [
    body('title')
        .optional()
        .trim()
        .isLength({
            min: 5,
            max: 100
        })
        .withMessage('Title must be between 5 and 100 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({
            min: 50,
            max: 5000
        })
        .withMessage('Description must be between 50 and 5000 characters'),
    body('category')
        .optional()
        .isIn([
            'Web Development',
            'Mobile Development',
            'UI/UX Design',
            'Data Science',
            'Machine Learning',
            'Digital Marketing',
            'Content Writing',
            'Graphic Design',
            'Video Editing',
            'Business Analysis',
            'Quality Assurance',
            'DevOps',
            'Cybersecurity',
            'Other'
        ])
        .withMessage('Invalid category'),
    body('status')
        .optional()
        .isIn(['draft', 'active', 'paused', 'closed', 'completed'])
        .withMessage('Invalid status'),
    body('workType')
        .optional()
        .isIn(['remote', 'onsite', 'hybrid'])
        .withMessage('Invalid work type'),
    body('experienceLevel')
        .optional()
        .isIn(['entry', 'intermediate', 'expert'])
        .withMessage('Invalid experience level'),
    body('budget.type')
        .optional()
        .isIn(['fixed', 'hourly', 'unpaid'])
        .withMessage('Invalid budget type'),
    body('applicationDeadline')
        .optional()
        .isISO8601()
        .custom((value) => {
            const deadline = new Date(value);
            const now = new Date();

            if (deadline <= now) {
                throw new Error('Application deadline must be in the future');
            }
            return true;
        }),
    exports.validate
];

const APPLICATION_STATUSES = [
    'submitted',
    'under_review',
    'shortlisted',
    'interview_scheduled',
    'accepted',
    'rejected',
    'withdrawn'
];

// Application creation validation rules
exports.validateApplicationCreation = [
    body('coverLetter')
        .trim()
        .isLength({ min: 50, max: 5000 })
        .withMessage('Cover letter must be between 50 and 5000 characters'),
    body('proposedRate')
        .optional({ values: 'falsy' })
        .isFloat({ min: 0 })
        .withMessage('Proposed rate must be a non-negative number'),
    body('proposed.rate')
        .optional({ values: 'falsy' })
        .isFloat({ min: 0 })
        .withMessage('Proposed rate must be a non-negative number'),
    body('proposedCurrency')
        .optional({ values: 'falsy' })
        .isString()
        .isLength({ min: 1, max: 10 })
        .withMessage('Proposed currency is invalid'),
    body('expectedStartDate')
        .optional({ values: 'falsy' })
        .isISO8601()
        .withMessage('Expected start date must be a valid ISO date'),
    body('availabilityHoursPerWeek')
        .optional({ values: 'falsy' })
        .isInt({ min: 1, max: 168 })
        .withMessage('Availability must be between 1 and 168 hours per week'),
    body('resumeUrl')
        .optional({ values: 'falsy' })
        .isString()
        .isLength({ max: 500 })
        .withMessage('Resume URL is invalid'),
    body('portfolioUrl')
        .optional({ values: 'falsy' })
        .isString()
        .isLength({ max: 500 })
        .withMessage('Portfolio URL is invalid'),
    body('attachments')
        .optional()
        .isArray()
        .withMessage('Attachments must be an array'),
    body('attachments.*.name')
        .optional({ values: 'falsy' })
        .isString()
        .isLength({ max: 255 })
        .withMessage('Attachment name must be a string up to 255 characters'),
    body('attachments.*.url')
        .optional({ values: 'falsy' })
        .isString()
        .isLength({ max: 500 })
        .withMessage('Attachment URL must be a string up to 500 characters'),
    body('attachments.*.type')
        .optional({ values: 'falsy' })
        .isString()
        .isLength({ max: 100 })
        .withMessage('Attachment type must be a string up to 100 characters'),
    exports.validate
];

// Application update validation rules
exports.validateApplicationUpdate = [
    body('coverLetter')
        .optional()
        .trim()
        .isLength({ min: 50, max: 5000 })
        .withMessage('Cover letter must be between 50 and 5000 characters'),
    body('proposedRate')
        .optional({ values: 'falsy' })
        .isFloat({ min: 0 })
        .withMessage('Proposed rate must be a non-negative number'),
    body('proposed.rate')
        .optional({ values: 'falsy' })
        .isFloat({ min: 0 })
        .withMessage('Proposed rate must be a non-negative number'),
    body('expectedStartDate')
        .optional({ values: 'falsy' })
        .isISO8601()
        .withMessage('Expected start date must be a valid ISO date'),
    body('availabilityHoursPerWeek')
        .optional({ values: 'falsy' })
        .isInt({ min: 1, max: 168 })
        .withMessage('Availability must be between 1 and 168 hours per week'),
    body('portfolioUrl')
        .optional({ values: 'falsy' })
        .isString()
        .isLength({ max: 500 })
        .withMessage('Portfolio URL is invalid'),
    body('attachments')
        .optional()
        .isArray()
        .withMessage('Attachments must be an array'),
    body('attachments.*.name')
        .optional({ values: 'falsy' })
        .isString()
        .isLength({ max: 255 })
        .withMessage('Attachment name must be a string up to 255 characters'),
    body('attachments.*.url')
        .optional({ values: 'falsy' })
        .isString()
        .isLength({ max: 500 })
        .withMessage('Attachment URL must be a string up to 500 characters'),
    body('attachments.*.type')
        .optional({ values: 'falsy' })
        .isString()
        .isLength({ max: 100 })
        .withMessage('Attachment type must be a string up to 100 characters'),
    exports.validate
];

// Application status-change validation rules
exports.validateApplicationStatusChange = [
    body('status')
        .isIn(APPLICATION_STATUSES)
        .withMessage('Invalid application status'),
    body('reason')
        .optional({ values: 'falsy' })
        .isString()
        .isLength({ max: 500 })
        .withMessage('Reason cannot exceed 500 characters'),
    exports.validate
];