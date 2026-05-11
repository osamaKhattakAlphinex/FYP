const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class TaskSkill extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        return values;
    }
}

TaskSkill.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        taskId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'tasks', key: 'id' },
            onDelete: 'CASCADE'
        },
        name: { type: DataTypes.STRING(150), allowNull: false },
        level: {
            type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
            defaultValue: 'intermediate'
        },
        required: { type: DataTypes.BOOLEAN, defaultValue: true }
    },
    {
        sequelize,
        modelName: 'TaskSkill',
        tableName: 'task_skills',
        timestamps: false,
        indexes: [{ fields: ['name'] }, { fields: ['taskId'] }]
    }
);

module.exports = TaskSkill;
