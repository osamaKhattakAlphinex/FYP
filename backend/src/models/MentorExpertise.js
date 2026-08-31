const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

// Capitalised to match StudentSkill. The AI service expects lowercase
// beginner|intermediate|advanced — aiService.normalizeSkillLevel does that mapping.
const EXPERTISE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

class MentorExpertise extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        return values;
    }
}

MentorExpertise.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        mentorId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'mentors', key: 'id' },
            onDelete: 'CASCADE'
        },
        name: { type: DataTypes.STRING(150), allowNull: false },
        level: {
            type: DataTypes.ENUM(...EXPERTISE_LEVELS),
            allowNull: false,
            defaultValue: 'Advanced'
        },
        yearsOfExperience: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: { min: 0, max: 60 }
        }
    },
    {
        sequelize,
        modelName: 'MentorExpertise',
        tableName: 'mentor_expertise',
        timestamps: true,
        indexes: [
            { fields: ['mentorId'] },
            { fields: ['name'] }
        ]
    }
);

MentorExpertise.LEVELS = EXPERTISE_LEVELS;

module.exports = MentorExpertise;
