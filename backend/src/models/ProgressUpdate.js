const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

const UPDATE_TYPES = ['checkin', 'blocker', 'risk_flag', 'note'];
const AUTHOR_ROLES = ['student', 'mentor', 'company', 'admin'];
// Only these need someone to close them out; a checkin or note never does.
const RESOLVABLE_TYPES = ['blocker', 'risk_flag'];

class ProgressUpdate extends Model {
    needsResolution() {
        return RESOLVABLE_TYPES.includes(this.type);
    }

    isOpen() {
        return this.needsResolution() && this.resolvedAt == null;
    }

    canBeEditedBy(userId) {
        return this.authorUserId != null && String(this.authorUserId) === String(userId);
    }

    // Whoever raised it can close it, and so can any supervisor.
    canBeResolvedBy(actor, userId) {
        if (!this.isOpen()) return false;
        if (!actor) return false;
        if (actor.role === 'admin') return true;
        if (this.canBeEditedBy(userId)) return true;
        if (actor.role === 'company') return true;
        if (actor.role === 'mentor') return !!actor.isActiveMentor;
        return false;
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        values.isOpen = this.isOpen();
        values.needsResolution = this.needsResolution();

        if (values.author && typeof values.author === 'object') {
            values.author = values.author.toJSON ? values.author.toJSON() : values.author;
        }
        if (values.milestone && typeof values.milestone === 'object') {
            values.milestone = values.milestone.toJSON ? values.milestone.toJSON() : values.milestone;
        }

        return values;
    }
}

ProgressUpdate.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        progressId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'internship_progress', key: 'id' },
            onDelete: 'CASCADE'
        },
        // Set when the update is about one specific milestone.
        milestoneId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'progress_milestones', key: 'id' },
            onDelete: 'SET NULL'
        },

        authorUserId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL'
        },
        authorRole: {
            type: DataTypes.ENUM(...AUTHOR_ROLES),
            allowNull: false
        },
        // Snapshotted so the timeline still reads correctly after account deletion.
        authorName: { type: DataTypes.STRING(200), allowNull: true },

        type: {
            type: DataTypes.ENUM(...UPDATE_TYPES),
            allowNull: false,
            defaultValue: 'checkin'
        },
        body: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                len: { args: [1, 4000], msg: 'Update must be between 1 and 4000 characters' }
            }
        },
        // Only meaningful on a checkin: the student's own read on where they are.
        percentSelfReported: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: { min: 0, max: 100 }
        },
        // True when the system raised this itself (health flipped to at_risk).
        isSystemGenerated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

        resolvedAt: { type: DataTypes.DATE, allowNull: true },
        resolvedByUserId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL'
        },
        resolutionNote: { type: DataTypes.STRING(1000), allowNull: true }
    },
    {
        sequelize,
        modelName: 'ProgressUpdate',
        tableName: 'progress_updates',
        timestamps: true,
        indexes: [
            { fields: ['progressId', 'createdAt'] },
            { fields: ['progressId', 'type', 'resolvedAt'] },
            { fields: ['milestoneId'] }
        ]
    }
);

ProgressUpdate.TYPES = UPDATE_TYPES;
ProgressUpdate.AUTHOR_ROLES = AUTHOR_ROLES;
ProgressUpdate.RESOLVABLE_TYPES = RESOLVABLE_TYPES;

module.exports = ProgressUpdate;
