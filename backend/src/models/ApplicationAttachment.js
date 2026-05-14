const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class ApplicationAttachment extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        return values;
    }
}

ApplicationAttachment.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        applicationId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'applications', key: 'id' },
            onDelete: 'CASCADE'
        },
        name: { type: DataTypes.STRING(255), allowNull: true },
        url: { type: DataTypes.STRING(500), allowNull: true },
        type: { type: DataTypes.STRING(100), allowNull: true }
    },
    {
        sequelize,
        modelName: 'ApplicationAttachment',
        tableName: 'application_attachments',
        timestamps: false,
        indexes: [{ fields: ['applicationId'] }]
    }
);

module.exports = ApplicationAttachment;
