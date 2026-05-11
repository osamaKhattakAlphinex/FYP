const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class StudentEducation extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        return values;
    }
}

StudentEducation.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        studentId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'students', key: 'id' },
            onDelete: 'CASCADE'
        },
        institution: { type: DataTypes.STRING(255), allowNull: false },
        degree: { type: DataTypes.STRING(255), allowNull: false },
        fieldOfStudy: { type: DataTypes.STRING(255), allowNull: true },
        startYear: { type: DataTypes.INTEGER, allowNull: true },
        endYear: { type: DataTypes.INTEGER, allowNull: true },
        isCurrentlyStudying: { type: DataTypes.BOOLEAN, defaultValue: false },
        grade: { type: DataTypes.STRING(100), allowNull: true },
        description: { type: DataTypes.TEXT, allowNull: true }
    },
    {
        sequelize,
        modelName: 'StudentEducation',
        tableName: 'student_education',
        timestamps: true
    }
);

module.exports = StudentEducation;
