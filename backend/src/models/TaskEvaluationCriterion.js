const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

// What each criterion is scored on. Every metric maps to one rule in the AI
// evaluator (ai-service/app/services/evaluator.py) and its backend fallback.
const METRICS = ['quality', 'timeliness', 'completion', 'communication', 'effort', 'reliability'];

// The rubric used for a task whose company never defined one, so every
// completed internship can be evaluated from day one.
const DEFAULT_CRITERIA = [
    {
        name: 'Quality of work',
        metric: 'quality',
        weight: 3,
        description: 'How reviewers rated the submitted work, adjusted for rework.'
    },
    {
        name: 'Timeliness',
        metric: 'timeliness',
        weight: 2,
        description: 'Whether milestones and the internship were delivered on schedule.'
    },
    {
        name: 'Scope completion',
        metric: 'completion',
        weight: 3,
        description: 'The weighted share of the planned milestones that were approved.'
    },
    {
        name: 'Communication',
        metric: 'communication',
        weight: 1,
        description: 'Regular check-ins, and raising blockers early.'
    },
    {
        name: 'Effort & commitment',
        metric: 'effort',
        weight: 1,
        description: 'Hours logged against the agreed weekly commitment or the estimates.'
    }
].map((c, i) => ({ ...c, orderIndex: i }));

// Limits enforced when a company replaces its rubric.
const MIN_CRITERIA = 1;
const MAX_CRITERIA = 8;

// The "predefined criteria" of the requirement: the rubric a company defines
// per task. Evaluations snapshot it (EvaluationCriterionScore), so editing the
// rubric later never rewrites an evaluation that already exists.
class TaskEvaluationCriterion extends Model {
    // Pure check of a proposed rubric, shared by the controller and the tests.
    // Returns a list of human-readable problems; empty means valid.
    static validateRubric(items) {
        const errors = [];
        if (!Array.isArray(items)) return ['criteria must be an array'];
        if (items.length < MIN_CRITERIA || items.length > MAX_CRITERIA) {
            errors.push(`A rubric needs between ${MIN_CRITERIA} and ${MAX_CRITERIA} criteria`);
        }

        const seen = new Set();
        items.forEach((item, i) => {
            const label = `Criterion ${i + 1}`;
            const name = item && typeof item.name === 'string' ? item.name.trim() : '';
            if (name.length < 2 || name.length > 100) {
                errors.push(`${label}: name must be between 2 and 100 characters`);
            } else {
                const key = name.toLowerCase();
                if (seen.has(key)) errors.push(`${label}: "${name}" is listed twice`);
                seen.add(key);
            }
            if (!item || !METRICS.includes(item.metric)) {
                errors.push(`${label}: metric must be one of ${METRICS.join(', ')}`);
            }
            const weight = Number(item && item.weight);
            if (!Number.isInteger(weight) || weight < 1 || weight > 10) {
                errors.push(`${label}: weight must be a whole number between 1 and 10`);
            }
            if (item && item.description != null && String(item.description).length > 500) {
                errors.push(`${label}: description cannot exceed 500 characters`);
            }
        });
        return errors;
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        values.weight = Number(values.weight) || 1;
        return values;
    }
}

TaskEvaluationCriterion.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        taskId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'tasks', key: 'id' },
            onDelete: 'CASCADE'
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: { notEmpty: { msg: 'Criterion name is required' } }
        },
        description: { type: DataTypes.STRING(500), allowNull: true },
        metric: { type: DataTypes.ENUM(...METRICS), allowNull: false },
        weight: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: { min: 1, max: 10 }
        },
        orderIndex: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
    },
    {
        sequelize,
        modelName: 'TaskEvaluationCriterion',
        tableName: 'task_evaluation_criteria',
        timestamps: true,
        indexes: [{ fields: ['taskId'] }]
    }
);

TaskEvaluationCriterion.METRICS = METRICS;
TaskEvaluationCriterion.DEFAULT_CRITERIA = DEFAULT_CRITERIA;
TaskEvaluationCriterion.MIN_CRITERIA = MIN_CRITERIA;
TaskEvaluationCriterion.MAX_CRITERIA = MAX_CRITERIA;

module.exports = TaskEvaluationCriterion;
