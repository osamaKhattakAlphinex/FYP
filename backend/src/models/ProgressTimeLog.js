const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

// Nobody logs more than this against one internship on a single day. Enforced
// in the controller (which can see the other rows for that day) as well.
const MAX_HOURS_PER_DAY = 16;
const MIN_HOURS_PER_ENTRY = 0.25;
const MAX_HOURS_PER_ENTRY = 16;

class ProgressTimeLog extends Model {
    canBeEditedBy(actor) {
        if (!actor) return false;
        if (actor.role === 'admin') return true;
        return actor.role === 'student' && String(actor.studentId) === String(this.studentId);
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        values.hours = Number(values.hours) || 0;

        if (values.milestone && typeof values.milestone === 'object') {
            values.milestone = values.milestone.toJSON ? values.milestone.toJSON() : values.milestone;
        }

        return values;
    }
}

ProgressTimeLog.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        progressId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'internship_progress', key: 'id' },
            onDelete: 'CASCADE'
        },
        // Optional: time can be logged against the internship as a whole.
        milestoneId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'progress_milestones', key: 'id' },
            onDelete: 'SET NULL'
        },
        studentId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'students', key: 'id' },
            onDelete: 'CASCADE'
        },

        workDate: { type: DataTypes.DATEONLY, allowNull: false },
        hours: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
            validate: {
                min: { args: [MIN_HOURS_PER_ENTRY], msg: 'A time entry must be at least 0.25 hours' },
                max: { args: [MAX_HOURS_PER_ENTRY], msg: 'A single entry cannot exceed 16 hours' }
            }
        },
        description: {
            type: DataTypes.STRING(500),
            allowNull: true
        }
    },
    {
        sequelize,
        modelName: 'ProgressTimeLog',
        tableName: 'progress_time_logs',
        timestamps: true,
        indexes: [
            { fields: ['progressId', 'workDate'] },
            { fields: ['milestoneId'] },
            { fields: ['studentId', 'workDate'] }
        ]
    }
);

ProgressTimeLog.MAX_HOURS_PER_DAY = MAX_HOURS_PER_DAY;
ProgressTimeLog.MIN_HOURS_PER_ENTRY = MIN_HOURS_PER_ENTRY;
ProgressTimeLog.MAX_HOURS_PER_ENTRY = MAX_HOURS_PER_ENTRY;

module.exports = ProgressTimeLog;
