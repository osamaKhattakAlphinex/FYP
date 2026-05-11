const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class TaskAttachment extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        return values;
    }
}

TaskAttachment.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        taskId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'tasks', key: 'id' },
            onDelete: 'CASCADE'
        },
        name: { type: DataTypes.STRING(255), allowNull: true },
        url: { type: DataTypes.STRING(500), allowNull: true },
        type: { type: DataTypes.STRING(50), allowNull: true }
    },
    {
        sequelize,
        modelName: 'TaskAttachment',
        tableName: 'task_attachments',
        timestamps: true
    }
);

module.exports = TaskAttachment;
