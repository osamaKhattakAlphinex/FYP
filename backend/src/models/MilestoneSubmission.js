const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

const SUBMISSION_STATUSES = ['pending_review', 'approved', 'changes_requested', 'superseded'];

class MilestoneSubmission extends Model {
    isAwaitingReview() {
        return this.status === 'pending_review';
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;

        values.hoursSpent = values.hoursSpent != null ? Number(values.hoursSpent) : null;

        values.links = {
            deliverable: values.deliverableUrl || undefined,
            repository: values.repositoryUrl || undefined,
            demo: values.demoUrl || undefined
        };

        if (values.reviewer && typeof values.reviewer === 'object') {
            values.reviewer = values.reviewer.toJSON ? values.reviewer.toJSON() : values.reviewer;
        }
        if (values.milestone && typeof values.milestone === 'object') {
            values.milestone = values.milestone.toJSON ? values.milestone.toJSON() : values.milestone;
        }

        return values;
    }
}

MilestoneSubmission.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        milestoneId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'progress_milestones', key: 'id' },
            onDelete: 'CASCADE'
        },
        // Denormalised so a progress-wide "submissions awaiting review" query
        // does not need to join through progress_milestones.
        progressId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'internship_progress', key: 'id' },
            onDelete: 'CASCADE'
        },
        studentId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'students', key: 'id' },
            onDelete: 'CASCADE'
        },

        // 1 for the first attempt, incremented on every resubmission. Previous
        // attempts are kept (status 'superseded') so the review history survives.
        attemptNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },

        summary: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Submission summary is required' },
                len: { args: [1, 5000], msg: 'Summary cannot exceed 5000 characters' }
            }
        },
        deliverableUrl: { type: DataTypes.STRING(500), allowNull: true },
        repositoryUrl: { type: DataTypes.STRING(500), allowNull: true },
        demoUrl: { type: DataTypes.STRING(500), allowNull: true },
        // Self-reported effort for this attempt; time_logs remain the source of
        // truth for the internship total.
        hoursSpent: { type: DataTypes.DECIMAL(6, 2), allowNull: true },

        status: {
            type: DataTypes.ENUM(...SUBMISSION_STATUSES),
            allowNull: false,
            defaultValue: 'pending_review'
        },

        reviewedByUserId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL'
        },
        reviewerRole: { type: DataTypes.STRING(20), allowNull: true },
        reviewerName: { type: DataTypes.STRING(200), allowNull: true },
        reviewNote: { type: DataTypes.TEXT, allowNull: true },
        // Optional 1-5 quality score per attempt, averaged into the final report.
        reviewScore: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: { min: 1, max: 5 }
        },
        reviewedAt: { type: DataTypes.DATE, allowNull: true },

        submittedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        // Snapshot of whether the milestone due date had already passed when the
        // student submitted — used for the on-time-delivery indicator.
        wasLate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
    },
    {
        sequelize,
        modelName: 'MilestoneSubmission',
        tableName: 'milestone_submissions',
        timestamps: true,
        indexes: [
            { fields: ['milestoneId', 'attemptNumber'] },
            { fields: ['progressId', 'status'] },
            { fields: ['studentId'] }
        ]
    }
);

MilestoneSubmission.STATUSES = SUBMISSION_STATUSES;

module.exports = MilestoneSubmission;
