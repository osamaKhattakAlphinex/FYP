const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

// Uploaded files kept in the database instead of on local disk. Used when
// FILE_STORAGE=db — on hosts such as Render the local disk is wiped on every
// deploy, so avatars, resumes and attachments would otherwise disappear.
// `key` is the path under /uploads (e.g. "avatars/avatar-123.png"), so the URLs
// stored on profiles are identical whichever storage is in use.
class StoredFile extends Model {}

StoredFile.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        key: { type: DataTypes.STRING(255), allowNull: false },
        mimeType: { type: DataTypes.STRING(150), allowNull: false },
        size: { type: DataTypes.INTEGER, allowNull: false },
        originalName: { type: DataTypes.STRING(255), allowNull: true },
        data: { type: DataTypes.BLOB('long'), allowNull: false }
    },
    {
        sequelize,
        modelName: 'StoredFile',
        tableName: 'stored_files',
        timestamps: true,
        // Declared here only (not column-level) so sync({alter}) does not add a
        // duplicate index on every boot.
        indexes: [{ unique: true, fields: ['key'] }]
    }
);

module.exports = StoredFile;
