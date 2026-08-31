const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

const AUTHOR_ROLES = ['mentor', 'student'];

class MentorNote extends Model {
    canBeEditedBy(userId) {
        return this.authorUserId != null && String(this.authorUserId) === String(userId);
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;

        if (values.author && typeof values.author === 'object') {
            values.author = values.author.toJSON ? values.author.toJSON() : values.author;
        }

        return values;
    }
}

MentorNote.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        assignmentId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'mentor_assignments', key: 'id' },
            onDelete: 'CASCADE'
        },
        authorUserId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL'
        },
        authorRole: {
            type: DataTypes.ENUM(...AUTHOR_ROLES),
            allowNull: false
        },
        authorName: { type: DataTypes.STRING(200), allowNull: true },
        body: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                len: { args: [1, 4000], msg: 'Note must be between 1 and 4000 characters' }
            }
        },
        // Mentors can pin key guidance so it stays at the top of the thread.
        isPinned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
    },
    {
        sequelize,
        modelName: 'MentorNote',
        tableName: 'mentor_notes',
        timestamps: true,
        indexes: [
            { fields: ['assignmentId', 'createdAt'] },
            { fields: ['assignmentId', 'isPinned'] }
        ]
    }
);

MentorNote.AUTHOR_ROLES = AUTHOR_ROLES;

module.exports = MentorNote;
