const { Op } = require('sequelize');
const {
    Student,
    Company,
    Task,
    Mentor,
    Application,
    MentorAssignment,
    InternshipProgress,
    Interview,
    Feedback
} = require('../models');
const ErrorResponse = require('../utils/errorResponse');
const aiService = require('../services/aiService');
const { resolveActor } = require('./progressController');
const {
    toneGuard,
    summarizeFeedback,
    internshipAssistEvidence,
    runAssist
} = require('../services/feedbackService');
const { notifyFeedbackReceived, notifyFeedbackResponded } = require('../utils/feedbackNotifications');

const NOT_CLOSED_MESSAGE = 'Feedback opens once the internship is completed or closed';
const INTERVIEW_NOT_DONE_MESSAGE = 'Feedback can be given once the interview is marked completed';
const DUPLICATE_MESSAGE = 'You have already left feedback here — edit it instead';
const LOCKED_MESSAGE =
    'The student has already acknowledged this feedback, so it can no longer be changed';

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

const feedbackIncludes = () => ([
    { model: Student, as: 'student', attributes: ['id', 'firstName', 'lastName', 'profilePicture'] },
    { model: Task, as: 'task', attributes: ['id', 'title', 'category'] },
    { model: Company, as: 'company', attributes: ['id', 'companyName', 'logo'] }
]);

const loadFeedback = (id) => Feedback.findByPk(id, { include: feedbackIncludes() });

// Snapshotted onto the record so it still reads correctly after the account goes.
const authorDisplayName = async (actor) => {
    if (actor.role === 'mentor' && actor.mentorId != null) {
        const m = await Mentor.findByPk(actor.mentorId, { attributes: ['firstName', 'lastName'] });
        return m ? [m.firstName, m.lastName].filter(Boolean).join(' ') : null;
    }
    if (actor.role === 'company' && actor.companyId != null) {
        const c = await Company.findByPk(actor.companyId, { attributes: ['companyName'] });
        return c ? c.companyName : null;
    }
    return null;
};

const withPermissions = (feedback, actor) => ({
    ...feedback.toJSON(),
    permissions: {
        canEdit: feedback.canBeEditedBy(actor),
        canDelete: feedback.canBeDeletedBy(actor),
        canAcknowledge: feedback.canBeAcknowledgedBy(actor)
    }
});

// Loads one record and the Module 8 actor for its application (so a mentor's
// assignment on that internship is taken into account).
const loadFeedbackForActor = async (id, user) => {
    const feedback = await loadFeedback(id);
    if (!feedback) return { error: new ErrorResponse('Feedback not found', 404) };
    const actor = await resolveActor(user, feedback.applicationId);
    if (!feedback.canBeViewedBy(actor)) {
        return { error: new ErrorResponse('Not authorized to access this feedback', 403) };
    }
    return { feedback, actor };
};

const cleanText = (v) => {
    if (v == null) return null;
    const t = String(v).trim();
    return t.length ? t : null;
};
const cleanSuggestions = (list) =>
    (Array.isArray(list) ? list : []).map((s) => String(s).trim()).filter((s) => s.length > 0);
const cleanRatings = (ratings) => {
    if (!ratings || typeof ratings !== 'object') return null;
    const out = Feedback.DIMENSIONS.reduce((acc, d) => {
        if (ratings[d] != null) acc[d] = Number(ratings[d]);
        return acc;
    }, {});
    return Object.keys(out).length ? out : null;
};

// ---------------------------------------------------------------------------
// Targets: the internship or interview a record is about
// ---------------------------------------------------------------------------

// Resolves the thing being written about, the actor, and whether they may
// author feedback on it. `error` carries the right status for each refusal.
const resolveTarget = async (context, targetId, user) => {
    if (context === 'interview') {
        const interview = await Interview.findByPk(targetId);
        if (!interview) return { error: new ErrorResponse('Interview not found', 404) };
        const actor = await resolveActor(user, interview.applicationId);
        const owns =
            actor.role === 'company' && actor.companyId != null &&
            String(actor.companyId) === String(interview.companyId);
        if (!owns) return { error: new ErrorResponse('Only the company that held the interview can give feedback on it', 403) };
        if (!Feedback.canAuthorInterviewFeedback(interview, actor)) {
            return { error: new ErrorResponse(INTERVIEW_NOT_DONE_MESSAGE, 400) };
        }
        return {
            actor,
            target: {
                context,
                progressId: null,
                interviewId: interview.id,
                applicationId: interview.applicationId,
                studentId: interview.studentId,
                taskId: interview.taskId,
                companyId: interview.companyId
            },
            interview
        };
    }

    const progress = await InternshipProgress.findByPk(targetId);
    if (!progress) return { error: new ErrorResponse('Progress record not found', 404) };
    const actor = await resolveActor(user, progress.applicationId);
    if (!Feedback.isInternshipSupervisor(progress, actor)) {
        return { error: new ErrorResponse('You cannot give feedback on this internship', 403) };
    }
    if (!Feedback.canAuthorInternshipFeedback(progress, actor)) {
        return { error: new ErrorResponse(NOT_CLOSED_MESSAGE, 400) };
    }
    return {
        actor,
        target: {
            context: 'internship',
            progressId: progress.id,
            interviewId: null,
            applicationId: progress.applicationId,
            studentId: progress.studentId,
            taskId: progress.taskId,
            companyId: progress.companyId
        },
        progress
    };
};

const targetIdFrom = (body) => (body.context === 'interview' ? body.interviewId : body.progressId);

const findOwnRecord = (userId, target) =>
    Feedback.findOne({
        where: target.context === 'interview'
            ? { authorUserId: userId, interviewId: target.interviewId }
            : { authorUserId: userId, progressId: target.progressId }
    });

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

const contextFilter = (query) =>
    Feedback.CONTEXTS.includes(query.context) ? { context: query.context } : {};

const listFor = async (where, req, actor) => {
    const { page, limit, offset } = paginate(req.query);
    const { rows, count } = await Feedback.findAndCountAll({
        where,
        include: feedbackIncludes(),
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
        offset,
        limit,
        distinct: true
    });
    return {
        records: rows.map((r) => withPermissions(r, actor)),
        pagination: paginationPayload(page, limit, count)
    };
};

// @desc    All feedback about the logged-in student (?context=)
// @route   GET /api/feedback/received
// @access  Private (student)
exports.getReceivedFeedback = async (req, res, next) => {
    try {
        const student = await resolveStudent(req.user.id);
        if (!student) return next(new ErrorResponse('Student profile not found', 404));
        const actor = { role: 'student', userId: req.user.id, studentId: student.id };
        const data = await listFor({ studentId: student.id, ...contextFilter(req.query) }, req, actor);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// @desc    Feedback the logged-in company / mentor has written (?context=)
// @route   GET /api/feedback/given
// @access  Private (company, mentor)
exports.getGivenFeedback = async (req, res, next) => {
    try {
        // The author rule is by user id, so no role profile lookup is needed.
        const actor = { role: req.user.role, userId: req.user.id };
        const data = await listFor({ authorUserId: req.user.id, ...contextFilter(req.query) }, req, actor);
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// @desc    Every feedback record, for moderation (?context=&studentId=&companyId=)
// @route   GET /api/feedback
// @access  Private (admin)
exports.getAllFeedback = async (req, res, next) => {
    try {
        const where = { ...contextFilter(req.query) };
        if (req.query.studentId && /^\d+$/.test(String(req.query.studentId))) where.studentId = req.query.studentId;
        if (req.query.companyId && /^\d+$/.test(String(req.query.companyId))) where.companyId = req.query.companyId;
        const data = await listFor(where, req, { role: 'admin', userId: req.user.id });
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Performance record summary
// ---------------------------------------------------------------------------

// Who may see a student's feedback summary: the student, an admin, a company
// the student has applied to (it is weighing them up — US-14 "so that others
// can trust the results"), or a mentor who was asked to guide them.
const canSeeSummary = async (user, studentId) => {
    if (user.role === 'admin') return true;
    if (user.role === 'student') {
        const student = await resolveStudent(user.id);
        return !!student && String(student.id) === String(studentId);
    }
    if (user.role === 'company') {
        const company = await resolveCompany(user.id);
        if (!company) return false;
        const count = await Application.count({
            where: { studentId },
            include: [{ model: Task, as: 'task', attributes: [], where: { companyId: company.id } }]
        });
        return count > 0;
    }
    if (user.role === 'mentor') {
        const mentor = await resolveMentor(user.id);
        if (!mentor) return false;
        const count = await MentorAssignment.count({
            where: { mentorId: mentor.id, studentId, status: { [Op.in]: ['pending', 'active', 'completed'] } }
        });
        return count > 0;
    }
    return false;
};

// Exposed so Module 11's candidate analytics use exactly the same viewer rule.
exports.canSeeSummary = canSeeSummary;

// @desc    A student's feedback summary (their performance record at a glance)
// @route   GET /api/feedback/students/:studentId/summary
// @access  Private (the student | admin | a company they applied to | their mentor)
exports.getStudentFeedbackSummary = async (req, res, next) => {
    try {
        const { studentId } = req.params;
        if (!/^\d+$/.test(String(studentId))) return next(new ErrorResponse('Student not found', 404));
        const student = await Student.findByPk(studentId, { attributes: ['id'] });
        if (!student) return next(new ErrorResponse('Student not found', 404));

        if (!(await canSeeSummary(req.user, student.id))) {
            return next(new ErrorResponse("Not authorized to view this student's feedback", 403));
        }

        const records = await Feedback.findAll({
            where: { studentId: student.id },
            include: [{ model: Task, as: 'task', attributes: ['id', 'title'] }]
        });
        res.status(200).json({
            success: true,
            data: { studentId: String(student.id), ...summarizeFeedback(records) }
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// One internship / one interview
// ---------------------------------------------------------------------------

const recordsWithPermissions = async (where, actor, userId) => {
    const rows = await Feedback.findAll({
        where,
        include: feedbackIncludes(),
        order: [['createdAt', 'ASC'], ['id', 'ASC']]
    });
    const visible = rows.filter((r) => r.canBeViewedBy(actor));
    const mine = rows.find((r) => String(r.authorUserId) === String(userId));
    return { records: visible.map((r) => withPermissions(r, actor)), mine };
};

// @desc    Feedback on one internship, plus whether the caller can give some
// @route   GET /api/feedback/progress/:progressId
// @access  Private (internship participants)
exports.getFeedbackForProgress = async (req, res, next) => {
    try {
        const progress = await InternshipProgress.findByPk(req.params.progressId, {
            attributes: ['id', 'applicationId', 'studentId', 'taskId', 'companyId', 'status']
        });
        if (!progress) return next(new ErrorResponse('Progress record not found', 404));
        const actor = await resolveActor(req.user, progress.applicationId);
        if (!progress.canBeViewedBy(actor)) {
            return next(new ErrorResponse('Not authorized to view this internship', 403));
        }

        const { records, mine } = await recordsWithPermissions({ progressId: progress.id }, actor, req.user.id);
        res.status(200).json({
            success: true,
            data: {
                records,
                permissions: {
                    canGive: Feedback.canAuthorInternshipFeedback(progress, actor),
                    // Lets the UI say "once the internship is closed" rather than nothing.
                    isAuthorRole: Feedback.isInternshipSupervisor(progress, actor),
                    hasGiven: !!mine,
                    myFeedbackId: mine ? String(mine.id) : null
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Feedback on one interview, plus whether the caller can give some
// @route   GET /api/feedback/interviews/:interviewId
// @access  Private (owning company | the interviewed student | admin)
exports.getFeedbackForInterview = async (req, res, next) => {
    try {
        const interview = await Interview.findByPk(req.params.interviewId);
        if (!interview) return next(new ErrorResponse('Interview not found', 404));
        const actor = await resolveActor(req.user, interview.applicationId);
        if (actor.role !== 'admin' && !interview.belongsToActor(actor)) {
            return next(new ErrorResponse('Not authorized to view this interview', 403));
        }

        const { records, mine } = await recordsWithPermissions({ interviewId: interview.id }, actor, req.user.id);
        const isOwner =
            actor.role === 'company' && String(actor.companyId) === String(interview.companyId);
        res.status(200).json({
            success: true,
            data: {
                records,
                permissions: {
                    canGive: Feedback.canAuthorInterviewFeedback(interview, actor),
                    isAuthorRole: isOwner,
                    hasGiven: !!mine,
                    myFeedbackId: mine ? String(mine.id) : null
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// AI assist
// ---------------------------------------------------------------------------

// @desc    Draft suggestions from the recorded evidence + a quality/tone review
// @route   POST /api/feedback/assist
// @access  Private (would-be authors: owning company | assigned mentor)
exports.assistFeedback = async (req, res, next) => {
    try {
        const { target, actor, progress, error } = await resolveTarget(
            req.body.context,
            targetIdFrom(req.body),
            req.user
        );
        if (error) return next(error);

        const [task, student] = await Promise.all([
            Task.findByPk(target.taskId, { attributes: ['id', 'title'] }),
            Student.findByPk(target.studentId, { attributes: ['id', 'firstName', 'lastName'] })
        ]);

        let evidence = { criteria: [], indicators: {}, source: 'none' };
        if (progress) evidence = await internshipAssistEvidence(progress);

        const draft = req.body.draft || {};
        const dto = aiService.mapFeedbackAssistToDto({
            context: target.context,
            taskTitle: task ? task.title : '',
            studentName: student ? [student.firstName, student.lastName].filter(Boolean).join(' ') : null,
            // A company's private closing rating is its own judgement, so it
            // is a fair default for the company's own draft — never a mentor's.
            overallRating: progress && actor.role === 'company' ? progress.performanceRating : null,
            criteria: evidence.criteria,
            indicators: evidence.indicators,
            draft: {
                strengths: draft.strengths,
                improvements: draft.improvements,
                suggestions: draft.suggestions,
                overall_rating: draft.overallRating
            }
        });

        const { result, aiGenerated } = await runAssist(dto);
        res.status(200).json({
            success: true,
            data: {
                aiGenerated,
                evidenceSource: evidence.source,
                ...result
            }
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Create / read / update / delete
// ---------------------------------------------------------------------------

const toneRejection = (res, issue) =>
    res.status(400).json({
        success: false,
        message: issue.message,
        errors: [{ field: 'tone', message: issue.message }]
    });

// @desc    Leave structured feedback on a closed internship or completed interview
// @route   POST /api/feedback
// @access  Private (owning company | assigned mentor; company only for interviews)
exports.createFeedback = async (req, res, next) => {
    try {
        const { target, actor, error } = await resolveTarget(
            req.body.context,
            targetIdFrom(req.body),
            req.user
        );
        if (error) return next(error);

        if (await findOwnRecord(req.user.id, target)) {
            return next(new ErrorResponse(DUPLICATE_MESSAGE, 409));
        }

        const values = {
            strengths: cleanText(req.body.strengths),
            improvements: cleanText(req.body.improvements),
            suggestions: cleanSuggestions(req.body.suggestions)
        };
        const issue = toneGuard(values);
        if (issue) return toneRejection(res, issue);

        let feedback;
        try {
            feedback = await Feedback.create({
                ...target,
                authorUserId: req.user.id,
                authorRole: actor.role,
                authorName: await authorDisplayName(actor),
                overallRating: Number(req.body.overallRating),
                ratings: cleanRatings(req.body.ratings),
                ...values,
                wouldRecommend: req.body.wouldRecommend == null ? null : !!req.body.wouldRecommend,
                aiAssisted: !!req.body.aiAssisted
            });
        } catch (err) {
            // Two submits racing past the check above: the unique index decides.
            if (err.name === 'SequelizeUniqueConstraintError') {
                return next(new ErrorResponse(DUPLICATE_MESSAGE, 409));
            }
            throw err;
        }

        notifyFeedbackReceived(feedback.id);

        const fresh = await loadFeedback(feedback.id);
        res.status(201).json({
            success: true,
            message: 'Feedback shared with the student',
            data: withPermissions(fresh, actor)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    One feedback record
// @route   GET /api/feedback/:id
// @access  Private (canBeViewedBy)
exports.getFeedback = async (req, res, next) => {
    try {
        const { feedback, actor, error } = await loadFeedbackForActor(req.params.id, req.user);
        if (error) return next(error);
        res.status(200).json({ success: true, data: withPermissions(feedback, actor) });
    } catch (error) {
        next(error);
    }
};

// @desc    Edit your feedback (until the student acknowledges it)
// @route   PUT /api/feedback/:id
// @access  Private (author)
exports.updateFeedback = async (req, res, next) => {
    try {
        const { feedback, actor, error } = await loadFeedbackForActor(req.params.id, req.user);
        if (error) return next(error);
        if (!feedback.isAuthor(actor)) {
            return next(new ErrorResponse('Only the author can edit this feedback', 403));
        }
        if (!feedback.canBeEditedBy(actor)) return next(new ErrorResponse(LOCKED_MESSAGE, 409));

        const b = req.body;
        const merged = {
            strengths: b.strengths !== undefined ? cleanText(b.strengths) : feedback.strengths,
            improvements: b.improvements !== undefined ? cleanText(b.improvements) : feedback.improvements,
            suggestions: b.suggestions !== undefined ? cleanSuggestions(b.suggestions) : feedback.toJSON().suggestions
        };

        const combined = String(merged.strengths || '').length + String(merged.improvements || '').length;
        if (combined < Feedback.MIN_COMBINED_TEXT) {
            const message = `Write at least ${Feedback.MIN_COMBINED_TEXT} characters across strengths and improvements`;
            return res.status(400).json({ success: false, message, errors: [{ field: 'strengths', message }] });
        }
        const issue = toneGuard(merged);
        if (issue) return toneRejection(res, issue);

        Object.assign(feedback, merged);
        if (b.overallRating !== undefined) feedback.overallRating = Number(b.overallRating);
        if (b.ratings !== undefined) feedback.ratings = cleanRatings(b.ratings);
        if (b.wouldRecommend !== undefined) {
            feedback.wouldRecommend = b.wouldRecommend == null ? null : !!b.wouldRecommend;
        }
        if (b.aiAssisted !== undefined) feedback.aiAssisted = !!b.aiAssisted;
        feedback.editedAt = new Date();
        await feedback.save();

        const fresh = await loadFeedback(feedback.id);
        res.status(200).json({ success: true, message: 'Feedback updated', data: withPermissions(fresh, actor) });
    } catch (error) {
        next(error);
    }
};

// @desc    Remove feedback (author before acknowledgement; admin any time)
// @route   DELETE /api/feedback/:id
// @access  Private (author | admin)
exports.deleteFeedback = async (req, res, next) => {
    try {
        const { feedback, actor, error } = await loadFeedbackForActor(req.params.id, req.user);
        if (error) return next(error);
        if (!feedback.canBeDeletedBy(actor)) {
            return next(
                feedback.isAuthor(actor)
                    ? new ErrorResponse(LOCKED_MESSAGE, 409)
                    : new ErrorResponse('Not authorized to delete this feedback', 403)
            );
        }
        await feedback.destroy();
        res.status(200).json({ success: true, message: 'Feedback deleted', data: { id: String(feedback.id) } });
    } catch (error) {
        next(error);
    }
};

// @desc    The student confirms they have read the feedback, optionally replying
// @route   PUT /api/feedback/:id/acknowledge
// @access  Private (the student it is about)
exports.acknowledgeFeedback = async (req, res, next) => {
    try {
        const { feedback, actor, error } = await loadFeedbackForActor(req.params.id, req.user);
        if (error) return next(error);
        if (feedback.isAcknowledged()) {
            return next(new ErrorResponse('You have already acknowledged this feedback', 409));
        }
        if (!feedback.canBeAcknowledgedBy(actor)) {
            return next(new ErrorResponse('Only the student this feedback is about can acknowledge it', 403));
        }

        const response = cleanText(req.body.response);
        if (response) {
            // Respect runs both ways (§2.3.2.5): the same guard applies to replies.
            const issue = toneGuard({ response });
            if (issue) return toneRejection(res, issue);
        }

        const now = new Date();
        feedback.studentAcknowledgedAt = now;
        if (response) {
            feedback.studentResponse = response;
            feedback.studentRespondedAt = now;
        }
        await feedback.save();

        if (response) notifyFeedbackResponded(feedback.id);

        res.status(200).json({
            success: true,
            message: response ? 'Thanks — your reply has been sent' : 'Feedback acknowledged',
            data: withPermissions(feedback, actor)
        });
    } catch (error) {
        next(error);
    }
};
