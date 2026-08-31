const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

const ASSIGNMENT_STATUSES = ['pending', 'active', 'declined', 'completed', 'cancelled'];
// An application may hold at most one assignment in these states at a time.
// Enforced in the controller (MySQL has no partial unique index), which is what
// lets a company re-assign after a mentor declines.
const OCCUPYING_STATUSES = ['pending', 'active'];
const TERMINAL_STATUSES = ['declined', 'completed', 'cancelled'];

class MentorAssignment extends Model {
    isActive() {
        return this.status === 'active';
    }

    isPending() {
        return this.status === 'pending';
    }

    // actor: { role, mentorId?, studentId?, companyId? } — resolved by the controller
    belongsToActor(actor) {
        if (!actor) return false;
        if (actor.role === 'mentor' && actor.mentorId != null) {
            return String(actor.mentorId) === String(this.mentorId);
        }
        if (actor.role === 'student' && actor.studentId != null) {
            return String(actor.studentId) === String(this.studentId);
        }
        if (actor.role === 'company' && actor.companyId != null) {
            return String(actor.companyId) === String(this.companyId);
        }
        return false;
    }

    canBeViewedBy(actor) {
        if (!actor) return false;
        if (actor.role === 'admin') return true;
        return this.belongsToActor(actor);
    }

    canBeRespondedBy(actor) {
        if (!actor || actor.role !== 'mentor') return false;
        if (this.status !== 'pending') return false;
        return this.belongsToActor(actor);
    }

    canBeCompletedBy(actor) {
        if (!actor) return false;
        if (this.status !== 'active') return false;
        if (actor.role === 'admin') return true;
        return actor.role === 'mentor' && this.belongsToActor(actor);
    }

    canBeCancelledBy(actor) {
        if (!actor) return false;
        if (!OCCUPYING_STATUSES.includes(this.status)) return false;
        if (actor.role === 'admin') return true;
        return actor.role === 'company' && this.belongsToActor(actor);
    }

    canBeRatedByStudent(actor) {
        if (!actor || actor.role !== 'student') return false;
        if (this.status !== 'completed') return false;
        if (this.studentRating != null) return false;
        return this.belongsToActor(actor);
    }

    // Notes are only useful while the mentorship is live or already finished.
    canExchangeNotes(actor) {
        if (!actor) return false;
        if (!['active', 'completed'].includes(this.status)) return false;
        return (
            (actor.role === 'mentor' || actor.role === 'student') && this.belongsToActor(actor)
        );
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;

        values.ratings = {
            student: values.studentRating != null ? values.studentRating : undefined,
            mentor: values.mentorRating != null ? values.mentorRating : undefined
        };

        values.feedback = {
            student: values.studentFeedback || undefined,
            mentor: values.mentorFeedback || undefined
        };

        ['mentor', 'student', 'task', 'company', 'application'].forEach((key) => {
            if (values[key] && typeof values[key] === 'object') {
                values[key] = values[key].toJSON ? values[key].toJSON() : values[key];
            }
        });

        if (Array.isArray(values.notes)) {
            values.notes = values.notes.map((n) => (n.toJSON ? n.toJSON() : n));
        }
        if (Array.isArray(values.statusHistory)) {
            values.statusHistory = values.statusHistory.map((h) => (h.toJSON ? h.toJSON() : h));
        }

        ['studentRating', 'mentorRating', 'studentFeedback', 'mentorFeedback'].forEach(
            (k) => delete values[k]
        );

        return values;
    }
}

MentorAssignment.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        applicationId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'applications', key: 'id' },
            onDelete: 'CASCADE'
        },
        mentorId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'mentors', key: 'id' },
            onDelete: 'CASCADE'
        },
        // Denormalised for fast dashboard lookups, same as Interview.js
        studentId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'students', key: 'id' },
            onDelete: 'CASCADE'
        },
        taskId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'tasks', key: 'id' },
            onDelete: 'CASCADE'
        },
        companyId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'companies', key: 'id' },
            onDelete: 'CASCADE'
        },

        status: {
            type: DataTypes.ENUM(...ASSIGNMENT_STATUSES),
            allowNull: false,
            defaultValue: 'pending'
        },
        matchScore: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: { min: 0, max: 100 }
        },
        assignedByUserId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL'
        },
        assignmentNote: { type: DataTypes.TEXT, allowNull: true },
        declineReason: { type: DataTypes.STRING(500), allowNull: true },
        cancellationReason: { type: DataTypes.STRING(500), allowNull: true },

        respondedAt: { type: DataTypes.DATE, allowNull: true },
        startedAt: { type: DataTypes.DATE, allowNull: true },
        completedAt: { type: DataTypes.DATE, allowNull: true },
        cancelledAt: { type: DataTypes.DATE, allowNull: true },
        lastNoteAt: { type: DataTypes.DATE, allowNull: true },

        studentRating: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1, max: 5 } },
        studentFeedback: { type: DataTypes.TEXT, allowNull: true },
        mentorRating: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1, max: 5 } },
        mentorFeedback: { type: DataTypes.TEXT, allowNull: true }
    },
    {
        sequelize,
        modelName: 'MentorAssignment',
        tableName: 'mentor_assignments',
        timestamps: true,
        indexes: [
            { fields: ['mentorId', 'status'] },
            { fields: ['studentId', 'status'] },
            { fields: ['companyId', 'status'] },
            { fields: ['applicationId', 'status'] },
            { fields: ['taskId'] }
        ]
    }
);

MentorAssignment.STATUSES = ASSIGNMENT_STATUSES;
MentorAssignment.OCCUPYING_STATUSES = OCCUPYING_STATUSES;
MentorAssignment.TERMINAL_STATUSES = TERMINAL_STATUSES;

module.exports = MentorAssignment;
