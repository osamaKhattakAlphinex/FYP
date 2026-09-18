const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

// A draft is visible to supervisors only and can be adjusted and regenerated;
// a finalized evaluation is released to the student, carries a verification
// code, and is frozen until an admin reopens it.
const EVALUATION_STATUSES = ['draft', 'finalized'];

// Grade bands on the 0-100 final score. Mirrored in the AI evaluator.
const GRADE_BANDS = [
    { min: 85, grade: 'A' },
    { min: 70, grade: 'B' },
    { min: 55, grade: 'C' },
    { min: 40, grade: 'D' }
];

const num = (v) => (v == null ? null : Number(v));
const round2 = (v) => Math.round(v * 100) / 100;

class InternshipEvaluation extends Model {
    isDraft() {
        return this.status === 'draft';
    }

    isFinalized() {
        return this.status === 'finalized';
    }

    // Who may evaluate an internship of `companyId`, before an evaluation row
    // even exists (the controller uses this to decide whether a read may
    // generate the draft).
    //
    // Deliberately wider than Module 8's supervise rule for mentors: by the
    // time an internship is evaluated the mentorship is usually `completed`,
    // and the mentor who guided the work is the natural evaluator. So any
    // mentor with an active **or completed** assignment on the application
    // (`isAssignedMentor`) counts, not only `isActiveMentor`.
    static isEvaluator(actor, companyId) {
        if (!actor) return false;
        if (actor.role === 'admin') return true;
        if (actor.role === 'company' && actor.companyId != null) {
            return String(actor.companyId) === String(companyId);
        }
        if (actor.role === 'mentor') return !!(actor.isAssignedMentor || actor.isActiveMentor);
        return false;
    }

    // actor: the Module 8 shape from progressController.resolveActor.
    canBeViewedBy(actor) {
        if (!actor) return false;
        if (InternshipEvaluation.isEvaluator(actor, this.companyId)) return true;
        // The student sees nothing until a reviewer has confirmed the outcome.
        if (actor.role === 'student' && actor.studentId != null) {
            return this.isFinalized() && String(actor.studentId) === String(this.studentId);
        }
        return false;
    }

    canBeEditedBy(actor) {
        return this.isDraft() && InternshipEvaluation.isEvaluator(actor, this.companyId);
    }

    canBeFinalizedBy(actor) {
        return this.canBeEditedBy(actor);
    }

    // Reopening un-releases a result the student has already seen, so it is
    // an admin act only.
    canBeReopenedBy(actor) {
        return !!actor && actor.role === 'admin' && this.isFinalized();
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;

        values.autoScore = num(values.autoScore);
        values.finalScore = num(values.finalScore);
        values.confidence = num(values.confidence);
        values.generationCount = Number(values.generationCount) || 0;
        ['strengths', 'improvements'].forEach((key) => {
            if (!Array.isArray(values[key])) values[key] = [];
        });

        if (Array.isArray(values.criteria)) {
            values.criteria = values.criteria
                .map((c) => (c.toJSON ? c.toJSON() : c))
                .sort((a, b) => (a.orderIndex - b.orderIndex) || (Number(a.id) - Number(b.id)));
        }

        ['student', 'task', 'company', 'progress'].forEach((key) => {
            if (values[key] && typeof values[key] === 'object') {
                values[key] = values[key].toJSON ? values[key].toJSON() : values[key];
            }
        });

        return values;
    }

    static gradeFor(score) {
        if (score == null || Number.isNaN(Number(score))) return null;
        const s = Number(score);
        const band = GRADE_BANDS.find((b) => s >= b.min);
        return band ? band.grade : 'F';
    }

    // Σ(weight·score)/Σweight over rows (instances or plain objects), rounded
    // to 2dp. Rows whose `field` is null are skipped; null when none remain.
    static weightedScore(rows, field) {
        const usable = (rows || [])
            .map((r) => (r && typeof r.get === 'function' ? r.get({ plain: true }) : r))
            .filter((r) => r && r[field] != null && !Number.isNaN(Number(r[field])));
        if (usable.length === 0) return null;
        const totalWeight = usable.reduce((sum, r) => sum + (Number(r.weight) || 1), 0);
        const total = usable.reduce(
            (sum, r) => sum + (Number(r.weight) || 1) * Number(r[field]),
            0
        );
        return round2(total / totalWeight);
    }
}

InternshipEvaluation.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        // One evaluation per internship. Uniqueness is declared once, in
        // `indexes` below: a column-level `unique` makes `sync({ alter: true })`
        // add another duplicate index on every boot under MySQL.
        progressId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'internship_progress', key: 'id' },
            onDelete: 'CASCADE'
        },
        // Denormalised for dashboard filters, same as InternshipProgress.
        applicationId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'applications', key: 'id' },
            onDelete: 'CASCADE'
        },
        studentId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'students', key: 'id' },
            onDelete: 'CASCADE'
        },
        taskId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'tasks', key: 'id' },
            onDelete: 'CASCADE'
        },
        companyId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'companies', key: 'id' },
            onDelete: 'CASCADE'
        },

        status: {
            type: DataTypes.ENUM(...EVALUATION_STATUSES),
            allowNull: false,
            defaultValue: 'draft'
        },

        // Weighted mean of the criteria's automated scores, and of the scores
        // after reviewer adjustment. Both recomputed, never edited directly.
        autoScore: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
        finalScore: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
        grade: { type: DataTypes.STRING(2), allowNull: true },
        // Share of criteria that were backed by recorded evidence, 0..1.
        confidence: { type: DataTypes.DECIMAL(4, 3), allowNull: true },
        // False when the backend's fallback rules produced the scores.
        aiGenerated: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

        summary: { type: DataTypes.TEXT, allowNull: true },
        strengths: { type: DataTypes.JSON, allowNull: true },
        improvements: { type: DataTypes.JSON, allowNull: true },
        // The exact input the scores were computed from, kept for audit.
        evidence: { type: DataTypes.JSON, allowNull: true },

        reviewerNote: { type: DataTypes.TEXT, allowNull: true },
        generatedAt: { type: DataTypes.DATE, allowNull: true },
        generationCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

        finalizedAt: { type: DataTypes.DATE, allowNull: true },
        finalizedByUserId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL'
        },
        finalizedByRole: { type: DataTypes.STRING(20), allowNull: true },
        // Snapshotted so the record still reads correctly after the account goes.
        finalizedByName: { type: DataTypes.STRING(200), allowNull: true },
        // Issued on finalize; lets a third party confirm the result publicly.
        verificationCode: { type: DataTypes.STRING(24), allowNull: true },

        reopenedAt: { type: DataTypes.DATE, allowNull: true },
        reopenReason: { type: DataTypes.STRING(500), allowNull: true }
    },
    {
        sequelize,
        modelName: 'InternshipEvaluation',
        tableName: 'internship_evaluations',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['progressId'] },
            { unique: true, fields: ['verificationCode'] },
            { fields: ['studentId', 'status'] },
            { fields: ['companyId', 'status'] },
            { fields: ['applicationId'] }
        ]
    }
);

InternshipEvaluation.STATUSES = EVALUATION_STATUSES;
InternshipEvaluation.GRADE_BANDS = GRADE_BANDS;

module.exports = InternshipEvaluation;
