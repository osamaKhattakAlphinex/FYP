const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, Student, Company, Admin } = require('../models');
const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/sendEmail');
const {
    getEmailVerificationTemplate,
    getOTPTemplate,
    getPasswordResetTemplate,
    getWelcomeTemplate
} = require('../utils/emailTemplates');

// Helper function to send token response
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
    const token = user.generateAuthToken();

    const options = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    };

    res
        .status(statusCode)
        .cookie('token', token, options)
        .json({
            success: true,
            message,
            token,
            user: {
                id: user.id,
                _id: user.id,
                email: user.email,
                role: user.role,
                isEmailVerified: user.isEmailVerified,
                avatar: user.avatar
            }
        });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
    let user = null;

    try {
        const {
            email,
            password,
            role,
            name,
            companyName,
            industry,
            companySize,
            website,
            phone
        } = req.body;

        console.log('Registration request:', { email, role, companyName, industry, companySize, website, phone });

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return next(new ErrorResponse('Email already registered', 400));
        }

        user = await User.create({ email, password, role });

        let userName = email;

        try {
            if (role === 'student') {
                if (!name) throw new Error('Name is required for students');
                const nameParts = name.trim().split(' ');
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(' ') || firstName;

                await Student.create({ userId: user.id, firstName, lastName });
                userName = firstName;
            } else if (role === 'company') {
                if (!companyName && !name) throw new Error('Company name is required');
                if (!industry) throw new Error('Industry is required for companies');
                if (!companySize) throw new Error('Company size is required');

                const finalCompanyName = companyName || name;
                const companyData = {
                    userId: user.id,
                    companyName: finalCompanyName,
                    industry,
                    companySize,
                    contactEmail: email
                };

                if (website) companyData.website = website;
                if (phone) companyData.contactPhone = phone;

                await Company.create(companyData);
                userName = finalCompanyName;
            } else if (role === 'admin') {
                if (!name) throw new Error('Name is required for admins');
                const nameParts = name.trim().split(' ');
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(' ') || firstName;

                await Admin.create({ userId: user.id, firstName, lastName });
                userName = firstName;
            }
        } catch (roleError) {
            console.error('Role profile creation error:', roleError);
            await user.destroy();
            return next(new ErrorResponse(roleError.message, 400));
        }

        const otp = user.generateOTP();
        await user.save();

        try {
            await sendEmail({
                email: user.email,
                subject: 'Email Verification OTP - Smart AI Platform',
                html: getOTPTemplate(otp, userName)
            });

            res.status(201).json({
                success: true,
                message: 'Registration successful. Please check your email for the verification code.',
                userId: user.id,
                email: user.email
            });
        } catch (emailError) {
            console.error('Email send error:', emailError);
            await user.destroy(); // cascade handles role rows
            return next(new ErrorResponse('Email could not be sent', 500));
        }
    } catch (error) {
        console.error('Registration error:', error);
        if (user && user.id) {
            try { await user.destroy(); } catch (e) { /* ignore */ }
        }
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new ErrorResponse('Please provide email and password', 400));
        }

        const user = await User.scope('withPassword').findOne({ where: { email } });

        if (!user) return next(new ErrorResponse('Invalid credentials', 401));

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return next(new ErrorResponse('Invalid credentials', 401));

        if (!user.isActive) return next(new ErrorResponse('Account has been deactivated', 403));

        user.lastLogin = new Date();
        await user.save();

        sendTokenResponse(user, 200, res, 'Login successful');
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
    try {
        res.cookie('token', 'none', {
            expires: new Date(Date.now() + 10 * 1000),
            httpOnly: true
        });

        res.status(200).json({ success: true, message: 'Logout successful' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id);

        let roleData = null;
        if (user.role === 'student') {
            roleData = await Student.findOne({ where: { userId: user.id } });
        } else if (user.role === 'company') {
            roleData = await Company.findOne({ where: { userId: user.id } });
        } else if (user.role === 'admin') {
            roleData = await Admin.findOne({ where: { userId: user.id } });
        }

        res.status(200).json({
            success: true,
            user: {
                ...user.toJSON(),
                roleData: roleData ? roleData.toJSON() : null
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify email with token
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res, next) => {
    try {
        const emailVerificationToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            where: {
                emailVerificationToken,
                emailVerificationExpire: { [Op.gt]: new Date() }
            }
        });

        if (!user) return next(new ErrorResponse('Invalid or expired verification token', 400));

        user.isEmailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationExpire = null;
        await user.save();

        let userName = user.email;
        if (user.role === 'student') {
            const student = await Student.findOne({ where: { userId: user.id } });
            if (student) userName = student.firstName;
        } else if (user.role === 'company') {
            const company = await Company.findOne({ where: { userId: user.id } });
            if (company) userName = company.companyName;
        }

        try {
            await sendEmail({
                email: user.email,
                subject: 'Welcome to Smart AI Platform!',
                html: getWelcomeTemplate(userName, user.role)
            });
        } catch (error) {
            console.error('Welcome email could not be sent:', error);
        }

        sendTokenResponse(user, 200, res, 'Email verified successfully');
    } catch (error) {
        next(error);
    }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
exports.resendVerification = async (req, res, next) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) return next(new ErrorResponse('User not found', 404));
        if (user.isEmailVerified) return next(new ErrorResponse('Email already verified', 400));

        const verificationToken = user.generateEmailVerificationToken();
        await user.save();

        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

        let userName = user.email;
        if (user.role === 'student') {
            const student = await Student.findOne({ where: { userId: user.id } });
            if (student) userName = student.firstName;
        } else if (user.role === 'company') {
            const company = await Company.findOne({ where: { userId: user.id } });
            if (company) userName = company.companyName;
        }

        await sendEmail({
            email: user.email,
            subject: 'Email Verification - Smart AI Platform',
            html: getEmailVerificationTemplate(verificationUrl, userName)
        });

        res.status(200).json({
            success: true,
            message: 'Verification email sent successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Send OTP for email verification
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOTP = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return next(new ErrorResponse('Email is required', 400));

        const user = await User.findOne({ where: { email } });
        if (!user) return next(new ErrorResponse('User not found', 404));
        if (user.isEmailVerified) return next(new ErrorResponse('Email already verified', 400));

        const otp = user.generateOTP();
        await user.save();

        let userName = email;
        if (user.role === 'student') {
            const student = await Student.findOne({ where: { userId: user.id } });
            if (student && student.firstName) userName = student.firstName;
        } else if (user.role === 'company') {
            const company = await Company.findOne({ where: { userId: user.id } });
            if (company && company.companyName) userName = company.companyName;
        } else if (user.role === 'admin') {
            const admin = await Admin.findOne({ where: { userId: user.id } });
            if (admin && admin.firstName) userName = admin.firstName;
        }

        try {
            await sendEmail({
                email: user.email,
                subject: 'Email Verification OTP - Smart AI Platform',
                html: getOTPTemplate(otp, userName)
            });

            res.status(200).json({
                success: true,
                message: 'OTP sent successfully to your email'
            });
        } catch (emailError) {
            console.error('Email send error:', emailError);
            user.otp = null;
            user.otpExpire = null;
            user.otpAttempts = 0;
            await user.save();

            return next(new ErrorResponse('Failed to send OTP email. Please try again.', 500));
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return next(new ErrorResponse('Email and OTP are required', 400));

        const user = await User.findOne({ where: { email } });
        if (!user) return next(new ErrorResponse('User not found', 404));
        if (user.isEmailVerified) return next(new ErrorResponse('Email already verified', 400));

        const result = user.verifyOTP(otp);
        if (!result.success) {
            await user.save();
            return next(new ErrorResponse(result.message, 400));
        }

        user.isEmailVerified = true;
        await user.save();

        let userName = email;
        if (user.role === 'student') {
            const student = await Student.findOne({ where: { userId: user.id } });
            if (student && student.firstName) userName = student.firstName;
        } else if (user.role === 'company') {
            const company = await Company.findOne({ where: { userId: user.id } });
            if (company && company.companyName) userName = company.companyName;
        } else if (user.role === 'admin') {
            const admin = await Admin.findOne({ where: { userId: user.id } });
            if (admin && admin.firstName) userName = admin.firstName;
        }

        try {
            await sendEmail({
                email: user.email,
                subject: 'Welcome to Smart AI Platform!',
                html: getWelcomeTemplate(userName, user.role)
            });
        } catch (error) {
            console.error('Welcome email could not be sent:', error);
        }

        sendTokenResponse(user, 200, res, 'Email verified successfully');
    } catch (error) {
        next(error);
    }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) return next(new ErrorResponse('User not found', 404));

        const resetToken = user.generateResetPasswordToken();
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        let userName = user.email;
        if (user.role === 'student') {
            const student = await Student.findOne({ where: { userId: user.id } });
            if (student) userName = student.firstName;
        } else if (user.role === 'company') {
            const company = await Company.findOne({ where: { userId: user.id } });
            if (company) userName = company.companyName;
        }

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset Request - Smart AI Platform',
                html: getPasswordResetTemplate(resetUrl, userName)
            });

            res.status(200).json({
                success: true,
                message: 'Password reset email sent successfully'
            });
        } catch (error) {
            user.resetPasswordToken = null;
            user.resetPasswordExpire = null;
            await user.save();
            return next(new ErrorResponse('Email could not be sent', 500));
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res, next) => {
    try {
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.scope('withPassword').findOne({
            where: {
                resetPasswordToken,
                resetPasswordExpire: { [Op.gt]: new Date() }
            }
        });

        if (!user) return next(new ErrorResponse('Invalid or expired reset token', 400));

        user.password = req.body.password;
        user.resetPasswordToken = null;
        user.resetPasswordExpire = null;
        await user.save();

        sendTokenResponse(user, 200, res, 'Password reset successful');
    } catch (error) {
        next(error);
    }
};

// @desc    Update password
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = async (req, res, next) => {
    try {
        const user = await User.scope('withPassword').findByPk(req.user.id);

        const isMatch = await user.comparePassword(req.body.currentPassword);
        if (!isMatch) return next(new ErrorResponse('Current password is incorrect', 401));

        user.password = req.body.newPassword;
        await user.save();

        sendTokenResponse(user, 200, res, 'Password updated successfully');
    } catch (error) {
        next(error);
    }
};

// @desc    Google OAuth callback
// @route   GET /api/auth/google
// @access  Public
exports.googleAuth = (req, res, next) => {
    req.session.oauthRole = req.query.role || 'student';
    next();
};

// @desc    Google OAuth callback success
// @route   GET /api/auth/google/callback
// @access  Public
exports.googleAuthCallback = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
        }

        const token = req.user.generateAuthToken();
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
        res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
};

// @desc    Delete account
// @route   DELETE /api/auth/delete-account
// @access  Private
exports.deleteAccount = async (req, res, next) => {
    try {
        const user = await User.scope('withPassword').findByPk(req.user.id);

        const isMatch = await user.comparePassword(req.body.password);
        if (!isMatch) return next(new ErrorResponse('Password is incorrect', 401));

        // Cascade delete from FK constraints handles Student/Company/Admin rows
        await user.destroy();

        res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
