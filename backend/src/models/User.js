const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sequelize } = require('../config/database');

class User extends Model {
    async comparePassword(enteredPassword) {
        return bcrypt.compare(enteredPassword, this.password);
    }

    generateAuthToken() {
        return jwt.sign(
            { id: this.id, role: this.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );
    }

    generateEmailVerificationToken() {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        this.emailVerificationToken = crypto
            .createHash('sha256')
            .update(verificationToken)
            .digest('hex');
        this.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
        return verificationToken;
    }

    generateResetPasswordToken() {
        const resetToken = crypto.randomBytes(32).toString('hex');
        this.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        this.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000);
        return resetToken;
    }

    generateOTP() {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        this.otp = crypto.createHash('sha256').update(otp).digest('hex');
        this.otpExpire = new Date(
            Date.now() + parseInt(process.env.OTP_EXPIRE_MINUTES || 10, 10) * 60 * 1000
        );
        this.otpAttempts = 0;
        return otp;
    }

    verifyOTP(enteredOTP) {
        const maxAttempts = parseInt(process.env.MAX_OTP_ATTEMPTS || 3, 10);

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

        if (Date.now() > new Date(this.otpExpire).getTime()) {
            return {
                success: false,
                message: 'OTP has expired. Please request a new code.'
            };
        }

        const hashedOTP = crypto.createHash('sha256').update(enteredOTP).digest('hex');

        if (hashedOTP === this.otp) {
            this.otp = null;
            this.otpExpire = null;
            this.otpAttempts = 0;
            return { success: true, message: 'OTP verified successfully' };
        }

        this.otpAttempts += 1;
        return {
            success: false,
            message: 'Invalid OTP',
            attemptsLeft: maxAttempts - this.otpAttempts
        };
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        delete values.password;
        return values;
    }
}

User.init(
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            autoIncrement: true,
            primaryKey: true
        },
        email: {
            type: DataTypes.STRING(191),
            allowNull: false,
            validate: {
                isEmail: { msg: 'Please provide a valid email' },
                notEmpty: { msg: 'Please provide an email' }
            },
            set(value) {
                if (typeof value === 'string') {
                    this.setDataValue('email', value.trim().toLowerCase());
                } else {
                    this.setDataValue('email', value);
                }
            }
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: true,
            validate: {
                len: {
                    args: [6, 255],
                    msg: 'Password must be at least 6 characters'
                }
            }
        },
        role: {
            // NOTE: 'mentor' is appended LAST on purpose. MySQL can add a new ENUM
            // member in-place only when it is appended; inserting mid-list forces a
            // full table copy on every `sequelize.sync({ alter: true })` boot.
            type: DataTypes.ENUM('student', 'company', 'admin', 'mentor'),
            allowNull: false
        },
        isEmailVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        googleId: {
            type: DataTypes.STRING(191),
            allowNull: true
        },
        avatar: {
            type: DataTypes.STRING(500),
            allowNull: true,
            defaultValue: null
        },
        emailVerificationToken: { type: DataTypes.STRING(255), allowNull: true },
        emailVerificationExpire: { type: DataTypes.DATE, allowNull: true },
        resetPasswordToken: { type: DataTypes.STRING(255), allowNull: true },
        resetPasswordExpire: { type: DataTypes.DATE, allowNull: true },
        otp: { type: DataTypes.STRING(255), allowNull: true },
        otpExpire: { type: DataTypes.DATE, allowNull: true },
        otpAttempts: { type: DataTypes.INTEGER, defaultValue: 0 },
        lastLogin: { type: DataTypes.DATE, allowNull: true }
    },
    {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        timestamps: true,
        // Declared as named indexes rather than attribute-level `unique: true`.
        // Under DB_SYNC=alter Sequelize re-runs changeColumn on every boot and
        // MySQL/MariaDB re-appends an attribute-level UNIQUE each time, so the
        // table gained email_2, email_3 ... two new indexes per restart until the
        // 64-key limit stopped the server booting. Index sync is diffed by name,
        // so these are idempotent. Names match the original indexes on purpose.
        indexes: [
            { unique: true, fields: ['email'], name: 'email' },
            { unique: true, fields: ['googleId'], name: 'googleId' }
        ],
        defaultScope: {
            attributes: { exclude: ['password'] }
        },
        scopes: {
            withPassword: { attributes: { include: ['password'] } }
        },
        hooks: {
            beforeSave: async (user) => {
                if (user.changed('password') && user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            }
        }
    }
);

module.exports = User;
