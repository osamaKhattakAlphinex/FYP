const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class StudentExperience extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        return values;
    }
}

StudentExperience.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        studentId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'students', key: 'id' },
            onDelete: 'CASCADE'
        },
        title: { type: DataTypes.STRING(255), allowNull: false },
        company: { type: DataTypes.STRING(255), allowNull: true },
        employmentType: {
            type: DataTypes.ENUM('Full-time', 'Part-time', 'Internship', 'Freelance'),
            allowNull: true
        },
        location: { type: DataTypes.STRING(255), allowNull: true },
        startDate: { type: DataTypes.STRING(50), allowNull: true },
        endDate: { type: DataTypes.STRING(50), allowNull: true },
        isCurrentlyWorking: { type: DataTypes.BOOLEAN, defaultValue: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        skills: { type: DataTypes.JSON, allowNull: true, defaultValue: [] }
    },
    {
        sequelize,
        modelName: 'StudentExperience',
        tableName: 'student_experiences',
        timestamps: true
    }
);

module.exports = StudentExperience;
