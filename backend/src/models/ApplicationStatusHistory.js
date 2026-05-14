const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class ApplicationStatusHistory extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        return values;
    }
}

ApplicationStatusHistory.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        applicationId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'applications', key: 'id' },
            onDelete: 'CASCADE'
        },
        fromStatus: { type: DataTypes.STRING(30), allowNull: true },
        toStatus: { type: DataTypes.STRING(30), allowNull: false },
        changedByUserId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL'
        },
        reason: { type: DataTypes.STRING(500), allowNull: true },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        sequelize,
        modelName: 'ApplicationStatusHistory',
        tableName: 'application_status_history',
        timestamps: false,
        indexes: [{ fields: ['applicationId'] }]
    }
);

module.exports = ApplicationStatusHistory;
