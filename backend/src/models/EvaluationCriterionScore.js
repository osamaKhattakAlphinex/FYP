const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

const num = (v) => (v == null ? null : Number(v));

// One rubric line of one evaluation. The criterion itself (name, metric,
// weight) is copied from the task rubric at generation time, so a later rubric
// edit never rewrites a past evaluation.
class EvaluationCriterionScore extends Model {
    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        values.weight = Number(values.weight) || 1;
        values.autoScore = num(values.autoScore);
        values.finalScore = num(values.finalScore);
        if (!Array.isArray(values.evidence)) values.evidence = [];
        return values;
    }
}

EvaluationCriterionScore.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        evaluationId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'internship_evaluations', key: 'id' },
            onDelete: 'CASCADE'
        },

        // Snapshot of the rubric line.
        name: { type: DataTypes.STRING(100), allowNull: false },
        description: { type: DataTypes.STRING(500), allowNull: true },
        metric: {
            type: DataTypes.ENUM(
                'quality',
                'timeliness',
                'completion',
                'communication',
                'effort',
                'reliability'
            ),
            allowNull: false
        },
        weight: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: { min: 1, max: 10 }
        },
        orderIndex: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

        // What the rules produced, and what the reviewer settled on. They are
        // equal until a reviewer adjusts; `adjusted` records that they differ.
        autoScore: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
        finalScore: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
        rationale: { type: DataTypes.TEXT, allowNull: true },
        // Short evidence lines behind the score (JSON array of strings).
        evidence: { type: DataTypes.JSON, allowNull: true },
        // False when the rule had nothing to go on and used the neutral score.
        hasEvidence: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

        adjusted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        adjustmentNote: { type: DataTypes.STRING(500), allowNull: true }
    },
    {
        sequelize,
        modelName: 'EvaluationCriterionScore',
        tableName: 'evaluation_criterion_scores',
        timestamps: true,
        indexes: [{ fields: ['evaluationId', 'orderIndex'] }]
    }
);

module.exports = EvaluationCriterionScore;
