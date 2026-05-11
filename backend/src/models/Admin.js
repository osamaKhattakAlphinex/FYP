const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Admin extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;

        values.permissions = {
            manageUsers: values.permManageUsers !== false,
            manageTasks: values.permManageTasks !== false,
            manageCompanies: values.permManageCompanies !== false,
            manageStudents: values.permManageStudents !== false,
            viewAnalytics: values.permViewAnalytics !== false,
            manageContent: values.permManageContent !== false,
            systemSettings: values.permSystemSettings === true
        };

        [
            'permManageUsers', 'permManageTasks', 'permManageCompanies', 'permManageStudents',
            'permViewAnalytics', 'permManageContent', 'permSystemSettings'
        ].forEach((k) => delete values[k]);

        return values;
    }
}

Admin.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        userId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            unique: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE'
        },
        firstName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: { notEmpty: { msg: 'Please provide first name' } }
        },
        lastName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: { notEmpty: { msg: 'Please provide last name' } }
        },
        phone: { type: DataTypes.STRING(50), allowNull: true },

        permManageUsers: { type: DataTypes.BOOLEAN, defaultValue: true },
        permManageTasks: { type: DataTypes.BOOLEAN, defaultValue: true },
        permManageCompanies: { type: DataTypes.BOOLEAN, defaultValue: true },
        permManageStudents: { type: DataTypes.BOOLEAN, defaultValue: true },
        permViewAnalytics: { type: DataTypes.BOOLEAN, defaultValue: true },
        permManageContent: { type: DataTypes.BOOLEAN, defaultValue: true },
        permSystemSettings: { type: DataTypes.BOOLEAN, defaultValue: false },

        isSuperAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
        lastActivity: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    },
    {
        sequelize,
        modelName: 'Admin',
        tableName: 'admins',
        timestamps: true
    }
);

module.exports = Admin;
