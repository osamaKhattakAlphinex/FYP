const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

// The lifecycle of the internship itself, once a student has been accepted.
// Distinct from Application.status (the hiring pipeline) and from
// MentorAssignment.status (whether a mentor is guiding the work).
const PROGRESS_STATUSES = ['not_started', 'in_progress', 'paused', 'completed', 'abandoned'];
const TERMINAL_STATUSES = ['completed', 'abandoned'];
// Health is derived, never set by a client. Recomputed by recalcProgressMetrics.
const HEALTH_STATUSES = ['on_track', 'at_risk', 'overdue'];

// A student who has not touched the internship for this long while it is
// in_progress is flagged at_risk so a mentor can step in early.
const STALE_ACTIVITY_DAYS = 7;
// How far progress may lag the elapsed schedule before it counts as at_risk.
const SCHEDULE_LAG_TOLERANCE = 15;

const DAY_MS = 24 * 60 * 60 * 1000;

// DATEONLY columns come back as 'YYYY-MM-DD'. A due date means "by the end of
// that day", so deadline comparisons use the following midnight — otherwise an
// internship due today would read as overdue from 00:01. `startOfDay` is used
// where the date is a boundary rather than a deadline (start dates, countdowns).
const startOfDay = (dateOnly) =>
    dateOnly == null ? null : new Date(`${String(dateOnly).slice(0, 10)}T00:00:00Z`).getTime();
const endOfDay = (dateOnly) => {
    const start = startOfDay(dateOnly);
    return start == null ? null : start + DAY_MS;
};

class InternshipProgress extends Model {
    isOpen() {
        return !TERMINAL_STATUSES.includes(this.status);
    }

    // actor: { role, studentId?, companyId?, mentorId?, isAssignedMentor? } —
    // resolved by the controller, same shape Module 7 uses.
    isParticipant(actor) {
        if (!actor) return false;
        if (actor.role === 'admin') return true;
        if (actor.role === 'student' && actor.studentId != null) {
            return String(actor.studentId) === String(this.studentId);
        }
        if (actor.role === 'company' && actor.companyId != null) {
            return String(actor.companyId) === String(this.companyId);
        }
        // A mentor is a participant only through a live/finished assignment on
        // this application, which the controller resolves into the actor.
        if (actor.role === 'mentor') return !!actor.isAssignedMentor;
        return false;
    }

    canBeViewedBy(actor) {
        return this.isParticipant(actor);
    }

    // The student drives the work forward: start, submit, log time, raise blockers.
    canBeWorkedOnBy(actor) {
        if (!actor || actor.role !== 'student' || actor.studentId == null) return false;
        if (!this.isOpen()) return false;
        if (this.status === 'paused') return false;
        return String(actor.studentId) === String(this.studentId);
    }

    // The supervisors: the owning company, or the mentor actively assigned to it.
    canBeSupervisedBy(actor) {
        if (!actor) return false;
        if (actor.role === 'admin') return true;
        if (actor.role === 'company' && actor.companyId != null) {
            return String(actor.companyId) === String(this.companyId);
        }
        if (actor.role === 'mentor') return !!actor.isActiveMentor;
        return false;
    }

    // Plan edits (add/remove/reorder milestones, change dates) stop once the
    // internship is closed, so a finished record stays an accurate history.
    canPlanBeEditedBy(actor) {
        return this.isOpen() && this.canBeSupervisedBy(actor);
    }

    canBeClosedBy(actor) {
        if (!this.isOpen()) return false;
        return this.canBeSupervisedBy(actor);
    }

    // Only the company that owns the task (or an admin) may pause, resume or abandon.
    canStatusBeChangedBy(actor) {
        if (!actor) return false;
        if (actor.role === 'admin') return true;
        return (
            actor.role === 'company' &&
            actor.companyId != null &&
            String(actor.companyId) === String(this.companyId)
        );
    }

    // Whole days left before the deadline. 0 on the due date itself, negative
    // once it has passed.
    daysRemaining(now = new Date()) {
        if (!this.targetEndDate) return null;
        return Math.ceil((startOfDay(this.targetEndDate) - now.getTime()) / DAY_MS);
    }

    isPastTargetEnd(now = new Date()) {
        if (!this.targetEndDate) return false;
        return endOfDay(this.targetEndDate) < now.getTime();
    }

    // Fraction of the planned window that has elapsed, 0..1 (null if undated).
    scheduleElapsedRatio(now = new Date()) {
        if (!this.startDate || !this.targetEndDate) return null;
        const start = startOfDay(this.startDate);
        const end = endOfDay(this.targetEndDate);
        if (!(end > start)) return null;
        const ratio = (now.getTime() - start) / (end - start);
        return Math.round(Math.max(0, Math.min(1, ratio)) * 1000) / 1000;
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;

        values.metrics = {
            progressPercent: Number(values.progressPercent) || 0,
            milestoneCount: Number(values.milestoneCount) || 0,
            completedMilestoneCount: Number(values.completedMilestoneCount) || 0,
            overdueMilestoneCount: Number(values.overdueMilestoneCount) || 0,
            openBlockerCount: Number(values.openBlockerCount) || 0,
            totalHoursLogged: values.totalHoursLogged != null ? Number(values.totalHoursLogged) : 0
        };

        values.schedule = {
            startDate: values.startDate || undefined,
            targetEndDate: values.targetEndDate || undefined,
            actualEndDate: values.actualEndDate || undefined,
            daysRemaining: this.daysRemaining(),
            elapsedRatio: this.scheduleElapsedRatio()
        };

        ['student', 'company', 'task', 'application', 'mentor'].forEach((key) => {
            if (values[key] && typeof values[key] === 'object') {
                values[key] = values[key].toJSON ? values[key].toJSON() : values[key];
            }
        });

        ['milestones', 'updates', 'timeLogs', 'statusHistory'].forEach((key) => {
            if (Array.isArray(values[key])) {
                values[key] = values[key].map((r) => (r.toJSON ? r.toJSON() : r));
            }
        });

        return values;
    }

    // Pure derivation so the same rule runs in recalc, in the report endpoint
    // and in tests. Never reads instance state.
    static deriveHealth({
        status,
        startDate,
        targetEndDate,
        progressPercent = 0,
        overdueMilestoneCount = 0,
        openBlockerCount = 0,
        lastActivityAt = null,
        now = new Date()
    }) {
        if (TERMINAL_STATUSES.includes(status)) return 'on_track';

        if (targetEndDate && endOfDay(targetEndDate) < now.getTime()) return 'overdue';
        if (overdueMilestoneCount > 0) return 'overdue';
        if (openBlockerCount > 0) return 'at_risk';

        if (startDate && targetEndDate) {
            const start = startOfDay(startDate);
            const end = endOfDay(targetEndDate);
            if (end > start) {
                const elapsedPct = Math.max(
                    0,
                    Math.min(100, ((now.getTime() - start) / (end - start)) * 100)
                );
                if (progressPercent + SCHEDULE_LAG_TOLERANCE < elapsedPct) return 'at_risk';
            }
        }

        if (status === 'in_progress' && lastActivityAt) {
            const idleDays = (now.getTime() - new Date(lastActivityAt).getTime()) / DAY_MS;
            if (idleDays > STALE_ACTIVITY_DAYS) return 'at_risk';
        }

        return 'on_track';
    }
}

InternshipProgress.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        // One progress record per accepted application — this is the internship.
        applicationId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            unique: true,
            references: { model: 'applications', key: 'id' },
            onDelete: 'CASCADE'
        },
        // Denormalised for dashboard filters, same as MentorAssignment.
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
        // Display cache of whoever is currently mentoring; authorisation always
        // re-reads mentor_assignments rather than trusting this column.
        mentorId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'mentors', key: 'id' },
            onDelete: 'SET NULL'
        },

        status: {
            type: DataTypes.ENUM(...PROGRESS_STATUSES),
            allowNull: false,
            defaultValue: 'not_started'
        },
        healthStatus: {
            type: DataTypes.ENUM(...HEALTH_STATUSES),
            allowNull: false,
            defaultValue: 'on_track'
        },

        startDate: { type: DataTypes.DATEONLY, allowNull: true },
        targetEndDate: { type: DataTypes.DATEONLY, allowNull: true },
        actualEndDate: { type: DataTypes.DATEONLY, allowNull: true },

        // All of these are recomputed by recalcProgressMetrics; never incremented.
        progressPercent: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: { min: 0, max: 100 }
        },
        milestoneCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        completedMilestoneCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        overdueMilestoneCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        openBlockerCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        totalHoursLogged: {
            type: DataTypes.DECIMAL(8, 2),
            allowNull: false,
            defaultValue: 0
        },

        expectedHoursPerWeek: { type: DataTypes.INTEGER, allowNull: true },
        objective: { type: DataTypes.TEXT, allowNull: true },

        lastActivityAt: { type: DataTypes.DATE, allowNull: true },
        startedAt: { type: DataTypes.DATE, allowNull: true },
        completedAt: { type: DataTypes.DATE, allowNull: true },
        pausedAt: { type: DataTypes.DATE, allowNull: true },
        abandonedAt: { type: DataTypes.DATE, allowNull: true },
        statusReason: { type: DataTypes.STRING(500), allowNull: true },

        // Final performance summary written when the internship is closed.
        completionNote: { type: DataTypes.TEXT, allowNull: true },
        performanceRating: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: { min: 1, max: 5 }
        },
        // True when a supervisor closed the internship with required milestones
        // still outstanding — surfaced in the report so it is never silent.
        closedWithOutstandingWork: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    },
    {
        sequelize,
        modelName: 'InternshipProgress',
        tableName: 'internship_progress',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['applicationId'] },
            { fields: ['studentId', 'status'] },
            { fields: ['companyId', 'status'] },
            { fields: ['mentorId', 'status'] },
            { fields: ['healthStatus'] },
            { fields: ['taskId'] }
        ]
    }
);

InternshipProgress.STATUSES = PROGRESS_STATUSES;
InternshipProgress.TERMINAL_STATUSES = TERMINAL_STATUSES;
InternshipProgress.HEALTH_STATUSES = HEALTH_STATUSES;
InternshipProgress.STALE_ACTIVITY_DAYS = STALE_ACTIVITY_DAYS;
InternshipProgress.SCHEDULE_LAG_TOLERANCE = SCHEDULE_LAG_TOLERANCE;

module.exports = InternshipProgress;
