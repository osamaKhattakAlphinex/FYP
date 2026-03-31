const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: [true, 'Please provide first name'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Please provide last name'],
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    permissions: {
        manageUsers: {
            type: Boolean,
            default: true
        },
        manageTasks: {
            type: Boolean,
            default: true
        },
        manageCompanies: {
            type: Boolean,
            default: true
        },
        manageStudents: {
            type: Boolean,
            default: true
        },
        viewAnalytics: {
            type: Boolean,
            default: true
        },
        manageContent: {
            type: Boolean,
            default: true
        },
        systemSettings: {
            type: Boolean,
            default: false
        }
    },
    isSuperAdmin: {
        type: Boolean,
        default: false
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Admin', adminSchema);