const crypto = require('crypto');
const User = require('../models/User');
const Student = require('../models/Student');
const Company = require('../models/Company');
const Admin = require('../models/Admin');
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
                id: user._id,
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

        console.log('Registration request:', {
            email,
            role,
            companyName,
            industry,
            companySize,
            website,
            phone
        });

        // Check if user already exists
        const existingUser = await User.findOne({
            email
        });
        if (existingUser) {
            return next(new ErrorResponse('Email already registered', 400));
        }

        // Create user
        user = await User.create({
            email,
            password,
            role
        });

        // Variables for email template
        let userName = email; // Default to email

        // Create role-specific profile
        try {
            if (role === 'student') {
                if (!name) {
                    throw new Error('Name is required for students');
                }
                // Split name into firstName and lastName
                const nameParts = name.trim().split(' ');
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(' ') || '';

                await Student.create({
                    userId: user._id,
                    firstName,
                    lastName
                });

                userName = firstName;
            } else if (role === 'company') {
                if (!companyName && !name) {
                    throw new Error('Company name is required');
                }
                if (!industry) {
                    throw new Error('Industry is required for companies');
                }
                if (!companySize) {
                    throw new Error('Company size is required');
                }

                const finalCompanyName = companyName || name;

                // Build company data object
                const companyData = {
                    userId: user._id,
                    companyName: finalCompanyName,
                    industry,
                    companySize,
                    contactInfo: {
                        email
                    }
                };

                // Add optional fields if provided
                if (website) {
                    companyData.website = website;
                }
                if (phone) {
                    companyData.contactInfo.phone = phone;
                }

                console.log('Creating company with data:', companyData);
                await Company.create(companyData);

                userName = finalCompanyName;
            } else if (role === 'admin') {
                if (!name) {
                    throw new Error('Name is required for admins');
                }
                // Split name into firstName and lastName
                const nameParts = name.trim().split(' ');
                const firstName = nameParts[0];
                const lastName = nameParts.slice(1).join(' ') || '';

                await Admin.create({
                    userId: user._id,
                    firstName,
                    lastName
                });

                userName = firstName;
            }
        } catch (roleError) {
            // If role-specific profile creation fails, delete the user
            console.error('Role profile creation error:', roleError);
            await User.findByIdAndDelete(user._id);
            return next(new ErrorResponse(roleError.message, 400));
        }

        // Generate OTP for email verification
        const otp = user.generateOTP();
        await user.save();

        // Send OTP email
        try {
            await sendEmail({
                email: user.email,
                subject: 'Email Verification OTP - Smart AI Platform',
                html: getOTPTemplate(otp, userName)
            });

            res.status(201).json({
                success: true,
                message: 'Registration successful. Please check your email for the verification code.',
                userId: user._id,
                email: user.email
            });
        } catch (emailError) {
            console.error('Email send error:', emailError);
            // Clean up user and role profile if email fails
            await User.findByIdAndDelete(user._id);
            if (role === 'student') {
                await Student.findOneAndDelete({
                    userId: user._id
                });
            } else if (role === 'company') {
                await Company.findOneAndDelete({
                    userId: user._id
                });
            } else if (role === 'admin') {
                await Admin.findOneAndDelete({
                    userId: user._id
                });
            }
            return next(new ErrorResponse('Email could not be sent', 500));
        }
    } catch (error) {
        console.error('Registration error:', error);
        // Clean up user if it was created
        if (user && user._id) {
            await User.findByIdAndDelete(user._id);
        }
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
    try {
        const {
            email,
            password
        } = req.body;

        // Validate email & password
        if (!email || !password) {
            return next(new ErrorResponse('Please provide email and password', 400));
        }

        // Check for user
        const user = await User.findOne({
            email
        }).select('+password');

        if (!user) {
            return next(new ErrorResponse('Invalid credentials', 401));
        }

        // Check if password matches
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return next(new ErrorResponse('Invalid credentials', 401));
        }

        // Check if account is active
        if (!user.isActive) {
            return next(new ErrorResponse('Account has been deactivated', 403));
        }

        // Update last login
        user.lastLogin = Date.now();
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

        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        // Get role-specific data
        let roleData = null;
        if (user.role === 'student') {
            roleData = await Student.findOne({
                userId: user._id
            });
        } else if (user.role === 'company') {
            roleData = await Company.findOne({
                userId: user._id
            });
        } else if (user.role === 'admin') {
            roleData = await Admin.findOne({
                userId: user._id
            });
        }

        res.status(200).json({
            success: true,
            user: {
                ...user.toObject(),
                roleData
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
        // Get hashed token
        const emailVerificationToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            emailVerificationToken,
            emailVerificationExpire: {
                $gt: Date.now()
            }
        });

        if (!user) {
            return next(new ErrorResponse('Invalid or expired verification token', 400));
        }

        // Update user
        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpire = undefined;
        await user.save();

        // Get user name for welcome email
        let userName = user.email;
        if (user.role === 'student') {
            const student = await Student.findOne({
                userId: user._id
            });
            userName = student.firstName;
        } else if (user.role === 'company') {
            const company = await Company.findOne({
                userId: user._id
            });
            userName = company.companyName;
        }

        // Send welcome email
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
        const {
            email
        } = req.body;

        const user = await User.findOne({
            email
        });

        if (!user) {
            return next(new ErrorResponse('User not found', 404));
        }

        if (user.isEmailVerified) {
            return next(new ErrorResponse('Email already verified', 400));
        }

        // Generate new verification token
        const verificationToken = user.generateEmailVerificationToken();
        await user.save();

        // Create verification URL
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

        // Get user name
        let userName = user.email;
        if (user.role === 'student') {
            const student = await Student.findOne({
                userId: user._id
            });
            userName = student.firstName;
        } else if (user.role === 'company') {
            const company = await Company.findOne({
                userId: user._id
            });
            userName = company.companyName;
        }

        // Send verification email
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
        const {
            email
        } = req.body;

        if (!email) {
            return next(new ErrorResponse('Email is required', 400));
        }

        const user = await User.findOne({
            email
        });

        if (!user) {
            return next(new ErrorResponse('User not found', 404));
        }

        if (user.isEmailVerified) {
            return next(new ErrorResponse('Email already verified', 400));
        }

        // Generate OTP
        const otp = user.generateOTP();
        await user.save();

        // Get user name
        let userName = email;
        if (user.role === 'student') {
            const student = await Student.findOne({
                userId: user._id
            });
            if (student && student.firstName) {
                userName = student.firstName;
            }
        } else if (user.role === 'company') {
            const company = await Company.findOne({
                userId: user._id
            });
            if (company && company.companyName) {
                userName = company.companyName;
            }
        } else if (user.role === 'admin') {
            const admin = await Admin.findOne({
                userId: user._id
            });
            if (admin && admin.firstName) {
                userName = admin.firstName;
            }
        }

        // Send OTP email
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
            user.otp = undefined;
            user.otpExpire = undefined;
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
        const {
            email,
            otp
        } = req.body;

        if (!email || !otp) {
            return next(new ErrorResponse('Email and OTP are required', 400));
        }

        const user = await User.findOne({
            email
        });

        if (!user) {
            return next(new ErrorResponse('User not found', 404));
        }

        if (user.isEmailVerified) {
            return next(new ErrorResponse('Email already verified', 400));
        }

        // Verify OTP
        const result = user.verifyOTP(otp);

        if (!result.success) {
            await user.save(); // Save updated attempt count
            return next(new ErrorResponse(result.message, 400));
        }

        // Update user
        user.isEmailVerified = true;
        await user.save();

        // Get user name for welcome email
        let userName = email;
        if (user.role === 'student') {
            const student = await Student.findOne({
                userId: user._id
            });
            if (student && student.firstName) {
                userName = student.firstName;
            }
        } else if (user.role === 'company') {
            const company = await Company.findOne({
                userId: user._id
            });
            if (company && company.companyName) {
                userName = company.companyName;
            }
        } else if (user.role === 'admin') {
            const admin = await Admin.findOne({
                userId: user._id
            });
            if (admin && admin.firstName) {
                userName = admin.firstName;
            }
        }

        // Send welcome email
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
        const {
            email
        } = req.body;

        const user = await User.findOne({
            email
        });

        if (!user) {
            return next(new ErrorResponse('User not found', 404));
        }

        // Generate reset token
        const resetToken = user.generateResetPasswordToken();
        await user.save();

        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        // Get user name
        let userName = user.email;
        if (user.role === 'student') {
            const student = await Student.findOne({
                userId: user._id
            });
            userName = student.firstName;
        } else if (user.role === 'company') {
            const company = await Company.findOne({
                userId: user._id
            });
            userName = company.companyName;
        }

        // Send reset email
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
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
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
        // Get hashed token
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: {
                $gt: Date.now()
            }
        });

        if (!user) {
            return next(new ErrorResponse('Invalid or expired reset token', 400));
        }

        // Set new password
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
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
        const user = await User.findById(req.user.id).select('+password');

        // Check current password
        const isMatch = await user.comparePassword(req.body.currentPassword);

        if (!isMatch) {
            return next(new ErrorResponse('Current password is incorrect', 401));
        }

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
    // Store role in session for OAuth callback
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

        // Generate token
        const token = req.user.generateAuthToken();

        // Redirect to frontend with token
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
        const user = await User.findById(req.user.id).select('+password');

        // Verify password
        const isMatch = await user.comparePassword(req.body.password);

        if (!isMatch) {
            return next(new ErrorResponse('Password is incorrect', 401));
        }

        // Delete role-specific data
        if (user.role === 'student') {
            await Student.findOneAndDelete({
                userId: user._id
            });
        } else if (user.role === 'company') {
            await Company.findOneAndDelete({
                userId: user._id
            });
        } else if (user.role === 'admin') {
            await Admin.findOneAndDelete({
                userId: user._id
            });
        }

        // Delete user
        await User.findByIdAndDelete(user._id);

        res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};