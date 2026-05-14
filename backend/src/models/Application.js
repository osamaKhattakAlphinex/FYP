const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

const APPLICATION_STATUSES = [
    'submitted',
    'under_review',
    'shortlisted',
    'interview_scheduled',
    'accepted',
    'rejected',
    'withdrawn'
];

class Application extends Model {
    canBeWithdrawnByStudent() {
        return ['submitted', 'under_review', 'shortlisted'].includes(this.status);
    }

    canBeEditedByStudent() {
        return this.status === 'submitted';
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;

        values.proposed = {
            rate: values.proposedRate != null ? Number(values.proposedRate) : undefined,
            currency: values.proposedCurrency || 'USD'
        };

        if (Array.isArray(values.attachments)) {
            values.attachments = values.attachments.map((a) => ({
                ...(a.toJSON ? a.toJSON() : a),
                _id: (a.toJSON ? a.toJSON() : a).id
            }));
        }

        if (Array.isArray(values.statusHistory)) {
            values.statusHistory = values.statusHistory.map((h) => ({
                ...(h.toJSON ? h.toJSON() : h),
                _id: (h.toJSON ? h.toJSON() : h).id
            }));
        }

        if (values.task && typeof values.task === 'object') {
            values.task = values.task.toJSON ? values.task.toJSON() : values.task;
        }

        if (values.student && typeof values.student === 'object') {
            values.student = values.student.toJSON ? values.student.toJSON() : values.student;
        }

        ['proposedRate', 'proposedCurrency'].forEach((k) => delete values[k]);

        return values;
    }
}

Application.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        taskId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'tasks', key: 'id' },
            onDelete: 'CASCADE'
        },
        studentId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'students', key: 'id' },
            onDelete: 'CASCADE'
        },
        coverLetter: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Cover letter is required' },
                len: {
                    args: [50, 5000],
                    msg: 'Cover letter must be between 50 and 5000 characters'
                }
            }
        },
        proposedRate: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
        proposedCurrency: { type: DataTypes.STRING(10), defaultValue: 'USD' },

        expectedStartDate: { type: DataTypes.DATE, allowNull: true },
        availabilityHoursPerWeek: { type: DataTypes.INTEGER, allowNull: true },

        resumeUrl: { type: DataTypes.STRING(500), allowNull: true },
        portfolioUrl: { type: DataTypes.STRING(500), allowNull: true },

        status: {
            type: DataTypes.ENUM(...APPLICATION_STATUSES),
            allowNull: false,
            defaultValue: 'submitted'
        },

        matchScore: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: { min: 0, max: 100 }
        },

        rejectionReason: { type: DataTypes.STRING(500), allowNull: true },
        companyNotes: { type: DataTypes.TEXT, allowNull: true },

        viewedByCompanyAt: { type: DataTypes.DATE, allowNull: true },
        submittedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        decidedAt: { type: DataTypes.DATE, allowNull: true }
    },
    {
        sequelize,
        modelName: 'Application',
        tableName: 'applications',
        timestamps: true,
        indexes: [
            { fields: ['taskId', 'status'] },
            { fields: ['studentId', 'status'] },
            { fields: ['status'] },
            { fields: ['submittedAt'] },
            { unique: true, fields: ['taskId', 'studentId'] }
        ],
        hooks: {
            beforeSave: (application) => {
                if (application.changed('status')) {
                    if (
                        ['accepted', 'rejected'].includes(application.status) &&
                        !application.decidedAt
                    ) {
                        application.decidedAt = new Date();
                    }
                }
            }
        }
    }
);

Application.STATUSES = APPLICATION_STATUSES;

module.exports = Application;
