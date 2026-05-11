const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class StudentProject extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        return values;
    }
}

StudentProject.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        studentId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'students', key: 'id' },
            onDelete: 'CASCADE'
        },
        title: { type: DataTypes.STRING(255), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        techStack: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
        projectUrl: { type: DataTypes.STRING(500), allowNull: true },
        githubUrl: { type: DataTypes.STRING(500), allowNull: true },
        thumbnailUrl: { type: DataTypes.STRING(500), allowNull: true },
        startDate: { type: DataTypes.STRING(50), allowNull: true },
        endDate: { type: DataTypes.STRING(50), allowNull: true }
    },
    {
        sequelize,
        modelName: 'StudentProject',
        tableName: 'student_projects',
        timestamps: true
    }
);

module.exports = StudentProject;
