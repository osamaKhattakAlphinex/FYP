const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

// What a feedback record is about: a finished internship (Module 8) or a
// completed interview (Module 5).
const FEEDBACK_CONTEXTS = ['internship', 'interview'];
// Who may write one. Admin is a moderator (can read and remove), not an author.
const AUTHOR_ROLES = ['company', 'mentor'];
// Optional per-dimension ratings, 1-5 each, on top of the required overall one.
const DIMENSIONS = ['technical', 'communication', 'professionalism', 'problemSolving', 'teamwork'];
// Internship feedback opens once the internship is closed, either way.
const FEEDBACK_OPEN_STATUSES = ['completed', 'abandoned'];

const MAX_SUGGESTIONS = 5;
const MAX_TEXT = 4000;
const MAX_RESPONSE = 2000;
// Strengths + improvements together, so a one-word "Good." is never the record.
const MIN_COMBINED_TEXT = 20;

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

// MySQL's JSON columns can come back as strings depending on the driver path.
const parseJson = (value, fallback) => {
    if (value == null) return fallback;
    if (typeof value === 'string') {
        try { return JSON.parse(value); } catch (e) { return fallback; }
    }
    return value;
};

class Feedback extends Model {
    isAcknowledged() {
        return this.studentAcknowledgedAt != null;
    }

    isAuthor(actor) {
        return !!actor && sameId(actor.userId, this.authorUserId);
    }

    // actor: the Module 8 shape from progressController.resolveActor, resolved
    // against this record's applicationId (so a mentor's assignment counts).
    canBeViewedBy(actor) {
        if (!actor) return false;
        if (actor.role === 'admin') return true;
        if (this.isAuthor(actor)) return true;
        if (actor.role === 'student') return sameId(actor.studentId, this.studentId);
        // The owning company sees everything written about work on its tasks,
        // including what a mentor wrote.
        if (actor.role === 'company') return sameId(actor.companyId, this.companyId);
        // A mentor only through an assignment on this internship; interviews
        // happen before any mentor is involved.
        if (actor.role === 'mentor') {
            return this.context === 'internship' && !!actor.isAssignedMentor;
        }
        return false;
    }

    // Once the student has read (and maybe answered) it, changing the text
    // would rewrite what they responded to — so the author's edit window
    // closes at acknowledgement.
    canBeEditedBy(actor) {
        return this.isAuthor(actor) && !this.isAcknowledged();
    }

    canBeDeletedBy(actor) {
        if (!actor) return false;
        // Moderation: an admin can remove abusive feedback at any time.
        if (actor.role === 'admin') return true;
        return this.canBeEditedBy(actor);
    }

    canBeAcknowledgedBy(actor) {
        return (
            !!actor &&
            actor.role === 'student' &&
            sameId(actor.studentId, this.studentId) &&
            !this.isAcknowledged()
        );
    }

    // Before a record exists: may this actor write feedback on the internship?
    // The owning company, or a mentor who guided it (active or completed
    // assignment — by the time an internship closes the mentorship usually has
    // too, same reasoning as Module 9's evaluator rule).
    static canAuthorInternshipFeedback(progress, actor) {
        if (!progress || !actor) return false;
        if (!FEEDBACK_OPEN_STATUSES.includes(progress.status)) return false;
        return Feedback.isInternshipSupervisor(progress, actor);
    }

    // Would be an author once the internship closes. Lets the UI explain "not
    // yet" rather than "not you".
    static isInternshipSupervisor(progress, actor) {
        if (!progress || !actor) return false;
        if (actor.role === 'company') return sameId(actor.companyId, progress.companyId);
        if (actor.role === 'mentor') return !!actor.isAssignedMentor;
        return false;
    }

    // US-14: the company gives feedback after the interview has taken place.
    static canAuthorInterviewFeedback(interview, actor) {
        if (!interview || !actor) return false;
        if (interview.status !== 'completed') return false;
        return actor.role === 'company' && sameId(actor.companyId, interview.companyId);
    }

    // Mean of the dimension ratings that were given, 2dp; null when none were.
    static averageOfRatings(ratings) {
        const values = DIMENSIONS
            .map((d) => (ratings ? ratings[d] : null))
            .filter((v) => v != null && !Number.isNaN(Number(v)))
            .map(Number);
        if (values.length === 0) return null;
        return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;

        const ratings = parseJson(values.ratings, {}) || {};
        values.ratings = DIMENSIONS.reduce((acc, d) => {
            if (ratings[d] != null) acc[d] = Number(ratings[d]);
            return acc;
        }, {});
        const suggestions = parseJson(values.suggestions, []);
        values.suggestions = Array.isArray(suggestions) ? suggestions : [];
        values.averageDimensionRating = Feedback.averageOfRatings(values.ratings);

        ['student', 'task', 'company', 'progress', 'interview', 'application', 'author'].forEach((key) => {
            if (values[key] && typeof values[key] === 'object') {
                values[key] = values[key].toJSON ? values[key].toJSON() : values[key];
            }
        });

        return values;
    }
}

Feedback.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        context: { type: DataTypes.ENUM(...FEEDBACK_CONTEXTS), allowNull: false },

        // Exactly one of these is set, matching `context`.
        progressId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'internship_progress', key: 'id' },
            onDelete: 'CASCADE'
        },
        interviewId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'interviews', key: 'id' },
            onDelete: 'CASCADE'
        },

        // Denormalised so feedback is "stored against the relevant task" and
        // becomes part of the student's record without joins.
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

        // The record outlives the author's account (it is part of the
        // student's history), so the name is snapshotted.
        authorUserId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL'
        },
        authorRole: { type: DataTypes.ENUM(...AUTHOR_ROLES), allowNull: false },
        authorName: { type: DataTypes.STRING(200), allowNull: true },

        overallRating: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 1, max: 5 }
        },
        ratings: { type: DataTypes.JSON, allowNull: true },
        strengths: { type: DataTypes.TEXT, allowNull: true },
        improvements: { type: DataTypes.TEXT, allowNull: true },
        suggestions: { type: DataTypes.JSON, allowNull: true },
        wouldRecommend: { type: DataTypes.BOOLEAN, allowNull: true },
        // The author started from the assistant's draft (transparency).
        aiAssisted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

        studentAcknowledgedAt: { type: DataTypes.DATE, allowNull: true },
        studentResponse: { type: DataTypes.TEXT, allowNull: true },
        studentRespondedAt: { type: DataTypes.DATE, allowNull: true },

        editedAt: { type: DataTypes.DATE, allowNull: true }
    },
    {
        sequelize,
        modelName: 'Feedback',
        tableName: 'feedback',
        timestamps: true,
        // One record per author per internship / interview. Declared here only:
        // a column-level `unique` duplicates the index on every MySQL
        // `sync({ alter: true })` (found in Module 9). NULLs never collide, so
        // an interview record's null progressId does not clash.
        indexes: [
            { unique: true, fields: ['authorUserId', 'progressId'] },
            { unique: true, fields: ['authorUserId', 'interviewId'] },
            { fields: ['studentId', 'createdAt'] },
            { fields: ['companyId'] },
            { fields: ['taskId'] }
        ]
    }
);

Feedback.CONTEXTS = FEEDBACK_CONTEXTS;
Feedback.AUTHOR_ROLES = AUTHOR_ROLES;
Feedback.DIMENSIONS = DIMENSIONS;
Feedback.OPEN_STATUSES = FEEDBACK_OPEN_STATUSES;
Feedback.MAX_SUGGESTIONS = MAX_SUGGESTIONS;
Feedback.MAX_TEXT = MAX_TEXT;
Feedback.MAX_RESPONSE = MAX_RESPONSE;
Feedback.MIN_COMBINED_TEXT = MIN_COMBINED_TEXT;

module.exports = Feedback;
