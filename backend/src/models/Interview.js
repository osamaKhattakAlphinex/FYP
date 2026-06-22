const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

const INTERVIEW_MODES = ['video', 'phone', 'onsite'];
const INTERVIEW_STATUSES = ['scheduled', 'rescheduled', 'completed', 'cancelled', 'no_show'];

class Interview extends Model {
    isUpcoming() {
        return (
            new Date(this.scheduledAt).getTime() > Date.now() &&
            ['scheduled', 'rescheduled'].includes(this.status)
        );
    }

    // actor: { role, studentId?, companyId? } — resolved by the controller
    belongsToActor(actor) {
        if (!actor) return false;
        if (
            actor.role === 'student' &&
            actor.studentId != null &&
            String(actor.studentId) === String(this.studentId)
        ) {
            return true;
        }
        if (
            actor.role === 'company' &&
            actor.companyId != null &&
            String(actor.companyId) === String(this.companyId)
        ) {
            return true;
        }
        return false;
    }

    canBeRescheduledBy(actor) {
        if (!actor) return false;
        if (this.rescheduleCount >= 3) return false;
        if (!this.isUpcoming()) return false;
        if (actor.role === 'admin') return true;
        return this.belongsToActor(actor);
    }

    canBeCancelledBy(actor) {
        if (!actor) return false;
        if (!this.isUpcoming()) return false;
        if (actor.role === 'admin') return true;
        if (!this.belongsToActor(actor)) return false;
        // Disallow cancelling within 2 hours of the scheduled time (non-admin)
        const twoHoursMs = 2 * 60 * 60 * 1000;
        const msUntil = new Date(this.scheduledAt).getTime() - Date.now();
        if (msUntil < twoHoursMs) return false;
        return true;
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;

        values.meeting = {
            link: values.meetingLink || undefined,
            location: values.meetingLocation || undefined,
            phoneNumber: values.meetingPhoneNumber || undefined
        };

        values.ratings = {
            company: values.companyRating != null ? values.companyRating : undefined,
            student: values.studentRating != null ? values.studentRating : undefined
        };

        if (values.task && typeof values.task === 'object') {
            values.task = values.task.toJSON ? values.task.toJSON() : values.task;
        }
        if (values.company && typeof values.company === 'object') {
            values.company = values.company.toJSON ? values.company.toJSON() : values.company;
        }
        if (values.student && typeof values.student === 'object') {
            values.student = values.student.toJSON ? values.student.toJSON() : values.student;
        }
        if (values.application && typeof values.application === 'object') {
            values.application = values.application.toJSON
                ? values.application.toJSON()
                : values.application;
        }

        ['meetingLink', 'meetingLocation', 'meetingPhoneNumber', 'companyRating', 'studentRating'].forEach(
            (k) => delete values[k]
        );

        return values;
    }
}

Interview.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        applicationId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'applications', key: 'id' },
            onDelete: 'CASCADE'
        },
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
        companyId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'companies', key: 'id' },
            onDelete: 'CASCADE'
        },
        scheduledAt: { type: DataTypes.DATE, allowNull: false },
        durationMinutes: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 30,
            validate: { min: 15, max: 180 }
        },
        mode: {
            type: DataTypes.ENUM(...INTERVIEW_MODES),
            allowNull: false
        },
        meetingLink: { type: DataTypes.STRING(500), allowNull: true },
        meetingLocation: { type: DataTypes.STRING(255), allowNull: true },
        meetingPhoneNumber: { type: DataTypes.STRING(50), allowNull: true },
        agenda: { type: DataTypes.TEXT, allowNull: true },
        status: {
            type: DataTypes.ENUM(...INTERVIEW_STATUSES),
            allowNull: false,
            defaultValue: 'scheduled'
        },
        rescheduleCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        cancellationReason: { type: DataTypes.STRING(500), allowNull: true },
        companyFeedback: { type: DataTypes.TEXT, allowNull: true },
        studentFeedback: { type: DataTypes.TEXT, allowNull: true },
        companyRating: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: { min: 1, max: 5 }
        },
        studentRating: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: { min: 1, max: 5 }
        },
        timezone: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'UTC' },
        createdByUserId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL'
        }
    },
    {
        sequelize,
        modelName: 'Interview',
        tableName: 'interviews',
        timestamps: true,
        indexes: [
            { fields: ['applicationId'] },
            { fields: ['companyId', 'scheduledAt'] },
            { fields: ['studentId', 'scheduledAt'] },
            { fields: ['status', 'scheduledAt'] }
        ]
    }
);

Interview.MODES = INTERVIEW_MODES;
Interview.STATUSES = INTERVIEW_STATUSES;

module.exports = Interview;
