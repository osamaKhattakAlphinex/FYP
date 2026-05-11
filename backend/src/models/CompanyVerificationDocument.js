const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class CompanyVerificationDocument extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        return values;
    }
}

CompanyVerificationDocument.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        companyId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'companies', key: 'id' },
            onDelete: 'CASCADE'
        },
        type: { type: DataTypes.STRING(100), allowNull: true },
        url: { type: DataTypes.STRING(500), allowNull: true },
        uploadedAt: { type: DataTypes.DATE, allowNull: true }
    },
    {
        sequelize,
        modelName: 'CompanyVerificationDocument',
        tableName: 'company_verification_documents',
        timestamps: true
    }
);

module.exports = CompanyVerificationDocument;
