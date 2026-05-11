const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class TaskUniqueViewer extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        return values;
    }
}

TaskUniqueViewer.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        taskId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'tasks', key: 'id' },
            onDelete: 'CASCADE'
        },
        userId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE'
        },
        viewedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    },
    {
        sequelize,
        modelName: 'TaskUniqueViewer',
        tableName: 'task_unique_viewers',
        timestamps: false,
        indexes: [{ unique: true, fields: ['taskId', 'userId'] }]
    }
);

module.exports = TaskUniqueViewer;
