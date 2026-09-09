const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

// One audit table for both levels of the module: rows with a null milestoneId
// describe the internship itself, rows with one describe a single milestone.
// Keeping them together means the workspace timeline is a single ordered read.
const ENTITY_TYPES = ['internship', 'milestone'];

class ProgressStatusHistory extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        return values;
    }
}

ProgressStatusHistory.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        progressId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'internship_progress', key: 'id' },
            onDelete: 'CASCADE'
        },
        milestoneId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'progress_milestones', key: 'id' },
            onDelete: 'CASCADE'
        },
        entityType: {
            type: DataTypes.ENUM(...ENTITY_TYPES),
            allowNull: false,
            defaultValue: 'internship'
        },
        // Denormalised so the milestone name survives the milestone's deletion.
        milestoneTitle: { type: DataTypes.STRING(200), allowNull: true },

        fromStatus: { type: DataTypes.STRING(30), allowNull: true },
        toStatus: { type: DataTypes.STRING(30), allowNull: false },

        changedByUserId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL'
        },
        changedByRole: { type: DataTypes.STRING(20), allowNull: true },
        reason: { type: DataTypes.STRING(500), allowNull: true },

        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        sequelize,
        modelName: 'ProgressStatusHistory',
        tableName: 'progress_status_history',
        timestamps: false,
        indexes: [
            { fields: ['progressId', 'createdAt'] },
            { fields: ['milestoneId'] }
        ]
    }
);

ProgressStatusHistory.ENTITY_TYPES = ENTITY_TYPES;

module.exports = ProgressStatusHistory;
