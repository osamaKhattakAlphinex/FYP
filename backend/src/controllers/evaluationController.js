const { Op } = require('sequelize');
const {
    sequelize,
    Student,
    Company,
    Task,
    Mentor,
    MentorAssignment,
    InternshipProgress,
    TaskEvaluationCriterion,
    InternshipEvaluation,
    EvaluationCriterionScore
} = require('../models');
const ErrorResponse = require('../utils/errorResponse');
const { resolveActor } = require('./progressController');
const {
    NOT_COMPLETED_MESSAGE,
    FINALIZED_MESSAGE,
    SUPERVISOR_RATING_PREFIX,
    criteriaForTask,
    generateEvaluation,
    generateVerificationCode,
    evaluationIncludes,
    loadEvaluation,
    applyTotals
} = require('../services/evaluationService');
const { notifyStudentOfEvaluation } = require('../utils/evaluationNotifications');

const NOT_RELEASED_MESSAGE = 'Your evaluation has not been released yet';
const MIN_ADJUSTMENT_NOTE = 5;

const resolveStudent = (userId) => Student.findOne({ where: { userId } });
const resolveCompany = (userId) => Company.findOne({ where: { userId } });
const resolveMentor = (userId) => Mentor.findOne({ where: { userId } });

const paginate = (query) => {
    const page = Math.max(1, parseInt(query.page || 1, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || 10, 10) || 10));
    return { page, limit, offset: (page - 1) * limit };
};

const paginationPayload = (page, limit, count) => {
    const totalPages = Math.ceil(count / limit) || 0;
    return {
        currentPage: page,
        totalPages,
        totalRecords: count,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
    };
};

// Snapshotted onto the evaluation at finalize, so it still reads correctly
// after the account is gone.
const actorDisplayName = async (actor) => {
    if (actor.role === 'mentor' && actor.mentorId != null) {
        const m = await Mentor.findByPk(actor.mentorId, { attributes: ['firstName', 'lastName'] });
        return m ? [m.firstName, m.lastName].filter(Boolean).join(' ') : null;
    }
    if (actor.role === 'company' && actor.companyId != null) {
        const c = await Company.findByPk(actor.companyId, { attributes: ['companyName'] });
        return c ? c.companyName : null;
    }
    if (actor.role === 'admin') return 'Platform admin';
    return null;
};

// A student only ever reaches a finalized evaluation (canBeViewedBy). The
// supervisor's private 1-5 closing rating stays hidden from them, as in
// Module 8 — both the raw evidence field and the evidence line quoting it.
const shapeForActor = (evaluation, actor) => {
    const json = evaluation.toJSON ? evaluation.toJSON() : evaluation;
    if (actor.role === 'student') {
        if (json.evidence && typeof json.evidence === 'object') {
            json.evidence = { ...json.evidence };
            delete json.evidence.supervisor_rating;
        }
        if (Array.isArray(json.criteria)) {
            json.criteria = json.criteria.map((c) => ({
                ...c,
                evidence: (c.evidence || []).filter(
                    (line) => !String(line).startsWith(SUPERVISOR_RATING_PREFIX)
                )
            }));
        }
    }
    return json;
};

const withPermissions = (evaluation, actor) => ({
    ...shapeForActor(evaluation, actor),
    permissions: {
        canEdit: evaluation.canBeEditedBy(actor),
        canFinalize: evaluation.canBeFinalizedBy(actor),
        canRegenerate: evaluation.canBeEditedBy(actor),
        canReopen: evaluation.canBeReopenedBy(actor)
    }
});

// Loads one evaluation (with its criteria) and the Module 8 actor for it.
const loadEvaluationForActor = async (id, user) => {
    const evaluation = await InternshipEvaluation.findByPk(id, {
        include: [{ model: EvaluationCriterionScore, as: 'criteria' }]
    });
    if (!evaluation) return { error: new ErrorResponse('Evaluation not found', 404) };
    const actor = await resolveActor(user, evaluation.applicationId);
    if (!evaluation.canBeViewedBy(actor)) {
        // A student probing their own unreleased draft learns only that it
        // is not released; anyone else is simply refused.
        const own =
            actor.role === 'student' &&
            actor.studentId != null &&
            String(actor.studentId) === String(evaluation.studentId);
        return {
            error: own
                ? new ErrorResponse(NOT_RELEASED_MESSAGE, 404)
                : new ErrorResponse('Not authorized to access this evaluation', 403)
        };
    }
    return { evaluation, actor };
};

// The internship and the actor, authorised with Module 8's own view rule.
const loadProgressForActor = async (progressId, user) => {
    const progress = await InternshipProgress.findByPk(progressId, {
        attributes: ['id', 'applicationId', 'studentId', 'taskId', 'companyId', 'status']
    });
    if (!progress) return { error: new ErrorResponse('Progress record not found', 404) };
    const actor = await resolveActor(user, progress.applicationId);
    if (!progress.canBeViewedBy(actor)) {
        return { error: new ErrorResponse('Not authorized to view this internship', 403) };
    }
    return { progress, actor };
};

// ---------------------------------------------------------------------------
// Public verification
// ---------------------------------------------------------------------------

// @desc    Confirm a finalized evaluation by its verification code
// @route   GET /api/evaluations/verify/:code
// @access  Public
exports.verifyEvaluation = async (req, res, next) => {
    try {
        const code = String(req.params.code || '').trim().toUpperCase();
        const notFound = new ErrorResponse('No finalized evaluation matches this code', 404);
        // Cheap shape check first, so garbage never reaches the database.
        if (!/^EV-[0-9A-F]{10}$/.test(code)) return next(notFound);

        const evaluation = await InternshipEvaluation.findOne({
            where: { verificationCode: code, status: 'finalized' },
            include: [
                { model: Student, as: 'student', attributes: ['firstName', 'lastName'] },
                { model: Task, as: 'task', attributes: ['title'] },
                { model: Company, as: 'company', attributes: ['companyName'] }
            ]
        });
        if (!evaluation) return next(notFound);

        // Deliberately minimal: enough to confirm the result, nothing about
        // the criteria, evidence or reviewer notes.
        res.status(200).json({
            success: true,
            data: {
                verificationCode: evaluation.verificationCode,
                studentName: evaluation.student
                    ? [evaluation.student.firstName, evaluation.student.lastName].filter(Boolean).join(' ')
                    : null,
                taskTitle: evaluation.task ? evaluation.task.title : null,
                companyName: evaluation.company ? evaluation.company.companyName : null,
                grade: evaluation.grade,
                finalScore: evaluation.finalScore != null ? Number(evaluation.finalScore) : null,
                finalizedAt: evaluation.finalizedAt
            }
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Role lists
// ---------------------------------------------------------------------------

const listIncludes = () => evaluationIncludes().filter((i) => i.as !== 'criteria');

const listFor = async (where, req, actor) => {
    const { page, limit, offset } = paginate(req.query);
    const { rows, count } = await InternshipEvaluation.findAndCountAll({
        where,
        include: listIncludes(),
        order: [['updatedAt', 'DESC']],
        offset,
        limit,
        distinct: true
    });
    return {
        records: rows.map((r) => shapeForActor(r, actor)),
        pagination: paginationPayload(page, limit, count)
    };
};

const statusFilter = (query) =>
    InternshipEvaluation.STATUSES.includes(query.status) ? { status: query.status } : {};

// @desc    The logged-in student's released evaluations
// @route   GET /api/evaluations/student
// @access  Private (student)
exports.getStudentEvaluations = async (req, res, next) => {
    try {
        const student = await resolveStudent(req.user.id);
        if (!student) return next(new ErrorResponse('Student profile not found', 404));
        const actor = { role: 'student', studentId: student.id, userId: req.user.id };
        // Drafts are never listed for the student, whatever the query says.
        const data = await listFor({ studentId: student.id, status: 'finalized' }, req, actor);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// @desc    Evaluations across the company's internships (?status=draft|finalized)
// @route   GET /api/evaluations/company
// @access  Private (company)
exports.getCompanyEvaluations = async (req, res, next) => {
    try {
        const company = await resolveCompany(req.user.id);
        if (!company) return next(new ErrorResponse('Company profile not found', 404));
        const actor = { role: 'company', companyId: company.id, userId: req.user.id };
        const data = await listFor({ companyId: company.id, ...statusFilter(req.query) }, req, actor);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// @desc    Evaluations of internships the mentor guided (active or completed)
// @route   GET /api/evaluations/mentor
// @access  Private (mentor)
exports.getMentorEvaluations = async (req, res, next) => {
    try {
        const mentor = await resolveMentor(req.user.id);
        if (!mentor) return next(new ErrorResponse('Mentor profile not found', 404));

        const assignments = await MentorAssignment.findAll({
            where: { mentorId: mentor.id, status: { [Op.in]: ['active', 'completed'] } },
            attributes: ['applicationId']
        });
        const applicationIds = assignments.map((a) => a.applicationId);
        if (applicationIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: { records: [], pagination: paginationPayload(1, 10, 0) }
            });
        }

        const actor = { role: 'mentor', mentorId: mentor.id, userId: req.user.id, isAssignedMentor: true };
        const data = await listFor(
            { applicationId: { [Op.in]: applicationIds }, ...statusFilter(req.query) },
            req,
            actor
        );
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Rubric (predefined criteria per task)
// ---------------------------------------------------------------------------

const loadOwnedTask = async (taskId, user) => {
    const task = await Task.findByPk(taskId, { attributes: ['id', 'title', 'companyId'] });
    if (!task) return { error: new ErrorResponse('Task not found', 404) };
    if (user.role === 'admin') return { task };
    const company = await resolveCompany(user.id);
    if (!company || String(company.id) !== String(task.companyId)) {
        return { error: new ErrorResponse('Not authorized to manage the rubric for this task', 403) };
    }
    return { task };
};

// @desc    The evaluation rubric for a task (the platform default if none is set)
// @route   GET /api/evaluations/tasks/:taskId/criteria
// @access  Private (owning company | admin)
exports.getTaskCriteria = async (req, res, next) => {
    try {
        const { task, error } = await loadOwnedTask(req.params.taskId, req.user);
        if (error) return next(error);
        const { criteria, isDefault } = await criteriaForTask(task.id);
        res.status(200).json({
            success: true,
            data: { taskId: String(task.id), taskTitle: task.title, criteria, isDefault }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Replace a task's rubric. Existing evaluations keep their snapshot.
// @route   PUT /api/evaluations/tasks/:taskId/criteria
// @access  Private (owning company | admin)
exports.replaceTaskCriteria = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { task, error } = await loadOwnedTask(req.params.taskId, req.user);
        if (error) { await t.rollback(); return next(error); }

        const items = req.body.criteria;
        const problems = TaskEvaluationCriterion.validateRubric(items);
        if (problems.length > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: problems[0],
                errors: problems.map((message) => ({ field: 'criteria', message }))
            });
        }

        await TaskEvaluationCriterion.destroy({ where: { taskId: task.id }, transaction: t });
        await TaskEvaluationCriterion.bulkCreate(
            items.map((item, i) => ({
                taskId: task.id,
                name: String(item.name).trim(),
                description: item.description ? String(item.description).trim() : null,
                metric: item.metric,
                weight: Number(item.weight),
                orderIndex: i
            })),
            { transaction: t }
        );
        await t.commit();

        const { criteria, isDefault } = await criteriaForTask(task.id);
        res.status(200).json({
            success: true,
            message: 'Evaluation rubric saved',
            data: { taskId: String(task.id), taskTitle: task.title, criteria, isDefault }
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// ---------------------------------------------------------------------------
// One internship's evaluation
// ---------------------------------------------------------------------------

// @desc    The evaluation of one internship (supervisors back-fill the draft)
// @route   GET /api/evaluations/progress/:progressId
// @access  Private (participants; the student only once finalized)
exports.getEvaluationForProgress = async (req, res, next) => {
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.progressId, req.user);
        if (error) return next(error);
        if (progress.status !== 'completed') {
            return next(new ErrorResponse(NOT_COMPLETED_MESSAGE, 400));
        }

        let evaluation = await InternshipEvaluation.findOne({ where: { progressId: progress.id } });
        if (!evaluation) {
            // Internships completed before Module 9 (or whose background
            // generation did not run) get their draft on first supervisor read,
            // the same back-fill rule Module 8 uses. A student never triggers it.
            if (!InternshipEvaluation.isEvaluator(actor, progress.companyId)) {
                return next(new ErrorResponse(NOT_RELEASED_MESSAGE, 404));
            }
            ({ evaluation } = await generateEvaluation(progress.id, { trigger: 'backfill' }));
        }

        if (!evaluation.canBeViewedBy(actor)) {
            return next(new ErrorResponse(NOT_RELEASED_MESSAGE, 404));
        }

        const fresh = await loadEvaluation(evaluation.id);
        res.status(200).json({ success: true, data: withPermissions(fresh, actor) });
    } catch (error) {
        next(error);
    }
};

// @desc    (Re)generate the automated draft from the latest evidence
// @route   POST /api/evaluations/progress/:progressId/generate
// @access  Private (owning company | assigned mentor | admin)
exports.generateForProgress = async (req, res, next) => {
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.progressId, req.user);
        if (error) return next(error);
        if (!InternshipEvaluation.isEvaluator(actor, progress.companyId)) {
            return next(new ErrorResponse('You cannot evaluate this internship', 403));
        }
        if (progress.status !== 'completed') {
            return next(new ErrorResponse(NOT_COMPLETED_MESSAGE, 400));
        }

        const { evaluation, created } = await generateEvaluation(progress.id, { trigger: 'manual' });
        res.status(created ? 201 : 200).json({
            success: true,
            message: created ? 'Evaluation generated' : 'Evaluation regenerated',
            data: withPermissions(evaluation, actor)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Adjust criterion scores (with a note), summary, feedback, reviewer note
// @route   PUT /api/evaluations/:id
// @access  Private (owning company | assigned mentor | admin; draft only)
exports.updateEvaluation = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { evaluation, actor, error } = await loadEvaluationForActor(req.params.id, req.user);
        if (error) { await t.rollback(); return next(error); }

        if (!InternshipEvaluation.isEvaluator(actor, evaluation.companyId)) {
            await t.rollback();
            return next(new ErrorResponse('You cannot edit this evaluation', 403));
        }
        if (!evaluation.canBeEditedBy(actor)) {
            await t.rollback();
            return next(new ErrorResponse(FINALIZED_MESSAGE, 409));
        }

        // --- per-criterion adjustments -----------------------------------
        const rowsById = new Map(evaluation.criteria.map((c) => [String(c.id), c]));
        const changes = Array.isArray(req.body.criteria) ? req.body.criteria : [];
        const problems = [];
        const touched = [];

        changes.forEach((change) => {
            const row = rowsById.get(String(change.id));
            if (!row) {
                problems.push(`Criterion ${change.id} does not belong to this evaluation`);
                return;
            }
            const score = Math.round(Number(change.finalScore) * 100) / 100;
            const auto = Number(row.autoScore);
            const note = typeof change.adjustmentNote === 'string' ? change.adjustmentNote.trim() : '';

            if (Math.abs(score - auto) < 0.005) {
                // Back to the automated score: no longer an adjustment.
                row.finalScore = auto;
                row.adjusted = false;
                row.adjustmentNote = null;
            } else if (note.length < MIN_ADJUSTMENT_NOTE) {
                // Fairness: every override of the automated outcome says why.
                problems.push(
                    `Explain the change to "${row.name}": a note of at least ${MIN_ADJUSTMENT_NOTE} ` +
                    `characters is required when the score differs from the automated ${auto}`
                );
                return;
            } else {
                row.finalScore = score;
                row.adjusted = true;
                row.adjustmentNote = note;
            }
            touched.push(row);
        });

        if (problems.length > 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: problems[0],
                errors: problems.map((message) => ({ field: 'criteria', message }))
            });
        }

        for (const row of touched) await row.save({ transaction: t });

        // --- narrative ---------------------------------------------------
        if (req.body.summary !== undefined) evaluation.summary = req.body.summary || null;
        if (req.body.strengths !== undefined) {
            evaluation.strengths = (req.body.strengths || []).map((s) => String(s).trim());
        }
        if (req.body.improvements !== undefined) {
            evaluation.improvements = (req.body.improvements || []).map((s) => String(s).trim());
        }
        if (req.body.reviewerNote !== undefined) {
            evaluation.reviewerNote = req.body.reviewerNote || null;
        }

        applyTotals(evaluation, evaluation.criteria);
        await evaluation.save({ transaction: t });
        await t.commit();

        const fresh = await loadEvaluation(evaluation.id);
        res.status(200).json({
            success: true,
            message: 'Evaluation updated',
            data: withPermissions(fresh, actor)
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// @desc    Confirm the outcome and release it to the student
// @route   PUT /api/evaluations/:id/finalize
// @access  Private (owning company | assigned mentor | admin; draft only)
exports.finalizeEvaluation = async (req, res, next) => {
    try {
        const { evaluation, actor, error } = await loadEvaluationForActor(req.params.id, req.user);
        if (error) return next(error);

        if (!InternshipEvaluation.isEvaluator(actor, evaluation.companyId)) {
            return next(new ErrorResponse('You cannot finalize this evaluation', 403));
        }
        if (!evaluation.canBeFinalizedBy(actor)) {
            return next(new ErrorResponse('This evaluation is already finalized', 409));
        }
        if (evaluation.finalScore == null) {
            return next(new ErrorResponse('Generate the evaluation before finalizing it', 400));
        }

        evaluation.status = 'finalized';
        evaluation.finalizedAt = new Date();
        evaluation.finalizedByUserId = req.user.id;
        evaluation.finalizedByRole = actor.role;
        evaluation.finalizedByName = await actorDisplayName(actor);

        // A 40-bit code collides essentially never; retry a couple of times
        // rather than surface a unique-index error if it ever does.
        let saved = false;
        for (let attempt = 0; attempt < 3 && !saved; attempt += 1) {
            evaluation.verificationCode = generateVerificationCode();
            try {
                await evaluation.save();
                saved = true;
            } catch (err) {
                if (err.name !== 'SequelizeUniqueConstraintError' || attempt === 2) throw err;
            }
        }

        notifyStudentOfEvaluation(evaluation.id);

        const fresh = await loadEvaluation(evaluation.id);
        res.status(200).json({
            success: true,
            message: 'Evaluation finalized and released to the student',
            data: withPermissions(fresh, actor)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Return a finalized evaluation to draft (withdraws the code)
// @route   PUT /api/evaluations/:id/reopen
// @access  Private (admin)
exports.reopenEvaluation = async (req, res, next) => {
    try {
        const { evaluation, actor, error } = await loadEvaluationForActor(req.params.id, req.user);
        if (error) return next(error);

        if (!evaluation.canBeReopenedBy(actor)) {
            return next(new ErrorResponse('Only a finalized evaluation can be reopened', 409));
        }

        evaluation.status = 'draft';
        evaluation.finalizedAt = null;
        evaluation.finalizedByUserId = null;
        evaluation.finalizedByRole = null;
        evaluation.finalizedByName = null;
        // The old code must stop verifying, since the result may now change.
        evaluation.verificationCode = null;
        evaluation.reopenedAt = new Date();
        evaluation.reopenReason = String(req.body.reason).trim();
        await evaluation.save();

        const fresh = await loadEvaluation(evaluation.id);
        res.status(200).json({
            success: true,
            message: 'Evaluation reopened for review',
            data: withPermissions(fresh, actor)
        });
    } catch (error) {
        next(error);
    }
};
