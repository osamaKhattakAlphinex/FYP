const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class CompanyTeamMember extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        return values;
    }
}

CompanyTeamMember.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        companyId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'companies', key: 'id' },
            onDelete: 'CASCADE'
        },
        name: { type: DataTypes.STRING(150), allowNull: true },
        designation: { type: DataTypes.STRING(150), allowNull: true },
        avatar: { type: DataTypes.STRING(500), allowNull: true },
        bio: { type: DataTypes.STRING(500), allowNull: true },
        linkedIn: { type: DataTypes.STRING(500), allowNull: true }
    },
    {
        sequelize,
        modelName: 'CompanyTeamMember',
        tableName: 'company_team_members',
        timestamps: true
    }
);

module.exports = CompanyTeamMember;
