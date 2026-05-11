const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class StudentCertificate extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        return values;
    }
}

StudentCertificate.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        studentId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'students', key: 'id' },
            onDelete: 'CASCADE'
        },
        title: { type: DataTypes.STRING(255), allowNull: false },
        issuer: { type: DataTypes.STRING(255), allowNull: true },
        issueDate: { type: DataTypes.STRING(50), allowNull: true },
        expiryDate: { type: DataTypes.STRING(50), allowNull: true },
        credentialId: { type: DataTypes.STRING(255), allowNull: true },
        credentialUrl: { type: DataTypes.STRING(500), allowNull: true },
        certificateImage: { type: DataTypes.STRING(500), allowNull: true },
        isNexInternCertificate: { type: DataTypes.BOOLEAN, defaultValue: false }
    },
    {
        sequelize,
        modelName: 'StudentCertificate',
        tableName: 'student_certificates',
        timestamps: true
    }
);

module.exports = StudentCertificate;
