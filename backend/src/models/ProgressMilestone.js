const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

const MILESTONE_STATUSES = [
    'pending',
    'in_progress',
    'submitted',
    'changes_requested',
    'completed',
    'blocked',
    'cancelled'
];

// Statuses that stop a milestone counting towards the weighted total.
const EXCLUDED_FROM_TOTAL = ['cancelled'];
// Statuses that earn their full weight.
const EARNING_STATUSES = ['completed'];
// A milestone in one of these is still work the student owes.
const OUTSTANDING_STATUSES = ['pending', 'in_progress', 'submitted', 'changes_requested', 'blocked'];

// Legal transitions. Anything not listed here is rejected with a 400 rather
// than silently applied, so the audit trail can never contain an impossible jump.
const TRANSITIONS = {
    // 'submitted' is reachable straight from 'pending' because handing work in
    // implies starting it — a student who never pressed "Start" must not be
    // blocked from submitting.
    pending: ['in_progress', 'submitted', 'blocked', 'cancelled'],
    in_progress: ['submitted', 'blocked', 'pending', 'cancelled'],
    submitted: ['completed', 'changes_requested', 'blocked', 'cancelled'],
    changes_requested: ['in_progress', 'submitted', 'blocked', 'cancelled'],
    blocked: ['in_progress', 'pending', 'cancelled'],
    // A reviewer may reopen a milestone they approved too early.
    completed: ['in_progress', 'cancelled'],
    cancelled: ['pending']
};

const DAY_MS = 24 * 60 * 60 * 1000;

class ProgressMilestone extends Model {
    static canTransition(from, to) {
        if (from === to) return false;
        return (TRANSITIONS[from] || []).includes(to);
    }

    static allowedTransitions(from) {
        return (TRANSITIONS[from] || []).slice();
    }

    countsTowardsTotal() {
        return !EXCLUDED_FROM_TOTAL.includes(this.status);
    }

    earnsWeight() {
        return EARNING_STATUSES.includes(this.status);
    }

    isOutstanding() {
        return OUTSTANDING_STATUSES.includes(this.status);
    }

    isOverdue(now = new Date()) {
        if (!this.dueDate) return false;
        if (!this.isOutstanding()) return false;
        // A DATEONLY due date means "end of that day", so compare against the
        // following midnight rather than 00:00 of the due date itself.
        const due = new Date(`${this.dueDate}T00:00:00Z`).getTime() + DAY_MS;
        return now.getTime() > due;
    }

    daysUntilDue(now = new Date()) {
        if (!this.dueDate) return null;
        const due = new Date(`${this.dueDate}T00:00:00Z`).getTime();
        return Math.ceil((due - now.getTime()) / DAY_MS);
    }

    // Students move a milestone forward; they never author or delete one.
    canBeStartedByStudent() {
        return this.status === 'pending' || this.status === 'changes_requested';
    }

    canBeSubmittedByStudent() {
        return ['in_progress', 'changes_requested', 'pending'].includes(this.status);
    }

    canBeReviewed() {
        return this.status === 'submitted';
    }

    canBeBlocked() {
        return ['pending', 'in_progress', 'changes_requested', 'submitted'].includes(this.status);
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;

        values.weight = Number(values.weight) || 1;
        values.estimatedHours =
            values.estimatedHours != null ? Number(values.estimatedHours) : null;
        values.actualHours = values.actualHours != null ? Number(values.actualHours) : 0;

        values.isOverdue = this.isOverdue();
        values.daysUntilDue = this.daysUntilDue();
        values.allowedTransitions = ProgressMilestone.allowedTransitions(values.status);

        if (Array.isArray(values.submissions)) {
            values.submissions = values.submissions.map((s) => (s.toJSON ? s.toJSON() : s));
        }
        if (values.latestSubmission && typeof values.latestSubmission === 'object') {
            values.latestSubmission = values.latestSubmission.toJSON
                ? values.latestSubmission.toJSON()
                : values.latestSubmission;
        }

        return values;
    }
}

ProgressMilestone.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        progressId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'internship_progress', key: 'id' },
            onDelete: 'CASCADE'
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Milestone title is required' },
                len: { args: [1, 200], msg: 'Milestone title cannot exceed 200 characters' }
            }
        },
        description: { type: DataTypes.TEXT, allowNull: true },

        // Position in the plan. Gaps are fine; the reorder endpoint rewrites them.
        orderIndex: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        // Relative importance, so "ship the app" is not worth the same as
        // "set up the repo" when the completion percentage is computed.
        weight: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: { min: 1, max: 10 }
        },
        // An optional milestone can be left unfinished without blocking completion.
        isRequired: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

        status: {
            type: DataTypes.ENUM(...MILESTONE_STATUSES),
            allowNull: false,
            defaultValue: 'pending'
        },
        dueDate: { type: DataTypes.DATEONLY, allowNull: true },

        estimatedHours: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
        // Recomputed from progress_time_logs; never incremented in place.
        actualHours: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },

        createdByUserId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL'
        },
        createdByRole: { type: DataTypes.STRING(20), allowNull: true },

        startedAt: { type: DataTypes.DATE, allowNull: true },
        submittedAt: { type: DataTypes.DATE, allowNull: true },
        completedAt: { type: DataTypes.DATE, allowNull: true },

        blockedReason: { type: DataTypes.STRING(500), allowNull: true },
        blockedAt: { type: DataTypes.DATE, allowNull: true },

        reviewedByUserId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL'
        },
        reviewerRole: { type: DataTypes.STRING(20), allowNull: true },
        reviewNote: { type: DataTypes.TEXT, allowNull: true },
        reviewedAt: { type: DataTypes.DATE, allowNull: true },
        // How many times the student has submitted this milestone. A high count
        // is itself a performance indicator.
        submissionCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
    },
    {
        sequelize,
        modelName: 'ProgressMilestone',
        tableName: 'progress_milestones',
        timestamps: true,
        indexes: [
            { fields: ['progressId', 'orderIndex'] },
            { fields: ['progressId', 'status'] },
            { fields: ['dueDate'] }
        ]
    }
);

ProgressMilestone.STATUSES = MILESTONE_STATUSES;
ProgressMilestone.OUTSTANDING_STATUSES = OUTSTANDING_STATUSES;
ProgressMilestone.EARNING_STATUSES = EARNING_STATUSES;
ProgressMilestone.EXCLUDED_FROM_TOTAL = EXCLUDED_FROM_TOTAL;
ProgressMilestone.TRANSITIONS = TRANSITIONS;

module.exports = ProgressMilestone;
