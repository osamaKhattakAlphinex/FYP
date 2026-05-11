const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class StudentSkill extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        return values;
    }
}

StudentSkill.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        studentId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'students', key: 'id' },
            onDelete: 'CASCADE'
        },
        name: { type: DataTypes.STRING(150), allowNull: false },
        level: {
            type: DataTypes.ENUM('Beginner', 'Intermediate', 'Advanced', 'Expert'),
            defaultValue: 'Intermediate'
        }
    },
    {
        sequelize,
        modelName: 'StudentSkill',
        tableName: 'student_skills',
        timestamps: true
    }
);

module.exports = StudentSkill;
