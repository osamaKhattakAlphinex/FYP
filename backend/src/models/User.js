const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email'
        ]
    },
    password: {
        type: String,
        required: function() {
            return !this.googleId; // Password not required for Google OAuth users
        },
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    role: {
        type: String,
        enum: ['student', 'company', 'admin'],
        required: [true, 'Please specify a role']
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    googleId: {
        type: String,
        sparse: true,
        unique: true
    },
    avatar: {
        type: String,
        default: null
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    otp: String,
    otpExpire: Date,
    otpAttempts: {
        type: Number,
        default: 0
    },
    lastLogin: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    },
    toObject: {
        virtuals: true
    }
});

// Virtual populate for role-specific data
userSchema.virtual('roleData', {
    refPath: 'role',
    localField: '_id',
    foreignField: 'userId',
    justOne: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
    return jwt.sign({
            id: this._id,
            role: this.role
        },
        process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE
        }
    );
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
    const verificationToken = crypto.randomBytes(32).toString('hex');

    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');

    this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    return verificationToken;
};

// Generate password reset token
userSchema.methods.generateResetPasswordToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour

    return resetToken;
};

// Generate OTP
userSchema.methods.generateOTP = function() {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash and store OTP
    this.otp = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');

    this.otpExpire = Date.now() + parseInt(process.env.OTP_EXPIRE_MINUTES || 10) * 60 * 1000;
    this.otpAttempts = 0;

    return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function(enteredOTP) {
    const maxAttempts = parseInt(process.env.MAX_OTP_ATTEMPTS || 3);

    if (this.otpAttempts >= maxAttempts) {
        return {
            success: false,
            message: 'Maximum OTP attempts exceeded. Please request a new code.'
        };
    }

    if (!this.otp || !this.otpExpire) {
        return {
            success: false,
            message: 'No OTP found. Please request a new code.'
        };
    }

    if (Date.now() > this.otpExpire) {
        return {
            success: false,
            message: 'OTP has expired. Please request a new code.'
        };
    }

    const hashedOTP = crypto
        .createHash('sha256')
        .update(enteredOTP)
        .digest('hex');

    if (hashedOTP === this.otp) {
        this.otp = undefined;
        this.otpExpire = undefined;
        this.otpAttempts = 0;
        return {
            success: true,
            message: 'OTP verified successfully'
        };
    }

    this.otpAttempts += 1;
    return {
        success: false,
        message: 'Invalid OTP',
        attemptsLeft: maxAttempts - this.otpAttempts
    };
};

module.exports = mongoose.model('User', userSchema);