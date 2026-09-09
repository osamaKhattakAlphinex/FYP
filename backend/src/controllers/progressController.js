const { Op } = require('sequelize');
const {
    sequelize,
    User,
    Student,
    Company,
    Task,
    Application,
    Mentor,
    MentorAssignment,
    InternshipProgress,
    ProgressMilestone,
    MilestoneSubmission,
    ProgressTimeLog,
    ProgressUpdate,
    ProgressStatusHistory,
    recalcMilestoneHours,
    recalcProgressMetrics,
    syncProgressMentor
} = require('../models');
const ErrorResponse = require('../utils/errorResponse');
const aiService = require('../services/aiService');
const {
    notifyStudentOfMilestone,
    notifyReviewersOfSubmission,
    notifyStudentOfReview,
    notifySupervisorsOfBlocker,
    notifyOfBlockerResolved,
    notifySupervisorsOfRisk,
    notifyOfProgressUpdate,
    notifyOfStatusChange,
    notifyOfCompletion
} = require('../utils/progressNotifications');

const STUDENT_BASIC_ATTRS = [
    'id', 'firstName', 'lastName', 'headline', 'profilePicture',
    'locationCity', 'locationCountry'
];
const COMPANY_MIN_ATTRS = ['id', 'companyName', 'logo', 'industry', 'contactEmail'];
const TASK_MIN_ATTRS = [
    'id', 'title', 'category', 'experienceLevel', 'status',
    'durationValue', 'durationUnit'
];
const MENTOR_MIN_ATTRS = [
    'id', 'firstName', 'lastName', 'headline', 'profilePicture', 'currentPosition'
];

const DAY_MS = 24 * 60 * 60 * 1000;
const todayIso = () => new Date().toISOString().slice(0, 10);
const asDateOnly = (v) => (v == null ? null : String(v).slice(0, 10));

const resolveStudent = (userId) => Student.findOne({ where: { userId } });
const resolveCompany = (userId) => Company.findOne({ where: { userId } });
const resolveMentor = (userId) => Mentor.findOne({ where: { userId } });

// ---------------------------------------------------------------------------
// Actor resolution
//
// Mentors are the awkward case: their access is not a property of their
// account but of whether they hold a mentor assignment on *this* application.
// `isAssignedMentor` (active or completed) grants read; `isActiveMentor`
// (active only) grants supervise. A finished mentorship keeps its read access
// so the mentor can still refer back to the work they guided.
// ---------------------------------------------------------------------------
const resolveActor = async (user, applicationId = null) => {
    const actor = { role: user.role, userId: user.id };

    if (user.role === 'student') {
        const student = await resolveStudent(user.id);
        if (student) actor.studentId = student.id;
    } else if (user.role === 'company') {
        const company = await resolveCompany(user.id);
        if (company) actor.companyId = company.id;
    } else if (user.role === 'mentor') {
        const mentor = await resolveMentor(user.id);
        if (mentor) actor.mentorId = mentor.id;

        if (mentor && applicationId != null) {
            const assignments = await MentorAssignment.findAll({
                where: {
                    applicationId,
                    mentorId: mentor.id,
                    status: { [Op.in]: ['active', 'completed'] }
                },
                attributes: ['id', 'status']
            });
            actor.isAssignedMentor = assignments.length > 0;
            actor.isActiveMentor = assignments.some((a) => a.status === 'active');
        }
    }

    return actor;
};

const progressIncludes = () => ([
    { model: Student, as: 'student', attributes: STUDENT_BASIC_ATTRS },
    { model: Company, as: 'company', attributes: COMPANY_MIN_ATTRS },
    { model: Task, as: 'task', attributes: TASK_MIN_ATTRS },
    { model: Mentor, as: 'mentor', attributes: MENTOR_MIN_ATTRS },
    { model: Application, as: 'application', attributes: ['id', 'status', 'decidedAt'] }
]);

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

const scopeToStatus = (scope) => {
    if (!scope || scope === 'all') return null;
    if (scope === 'active') return ['not_started', 'in_progress'];
    if (scope === 'in_progress') return ['in_progress'];
    if (scope === 'not_started') return ['not_started'];
    if (scope === 'paused') return ['paused'];
    if (scope === 'completed') return ['completed'];
    if (scope === 'closed') return ['completed', 'abandoned'];
    return null;
};

const logTransition = (
    progressId,
    { milestoneId = null, milestoneTitle = null, fromStatus, toStatus, userId, role, reason },
    transaction
) =>
    ProgressStatusHistory.create(
        {
            progressId,
            milestoneId,
            entityType: milestoneId ? 'milestone' : 'internship',
            milestoneTitle,
            fromStatus: fromStatus || null,
            toStatus,
            changedByUserId: userId || null,
            changedByRole: role || null,
            reason: reason || null
        },
        { transaction }
    );

// Human-readable name for whoever is acting, snapshotted onto rows so the
// timeline still reads correctly after an account is deleted.
const actorDisplayName = async (actor) => {
    if (actor.role === 'student' && actor.studentId != null) {
        const s = await Student.findByPk(actor.studentId, { attributes: ['firstName', 'lastName'] });
        return s ? [s.firstName, s.lastName].filter(Boolean).join(' ') : null;
    }
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

// ---------------------------------------------------------------------------
// Loading + lazy creation
// ---------------------------------------------------------------------------

// The internship record is created the moment an application is accepted, but
// applications accepted before Module 8 existed have none — so every read path
// goes through here and back-fills. `findOrCreate` keeps two concurrent first
// reads from producing two rows (the unique index on applicationId is the
// final guard).
const ensureProgressForApplication = async (application, options = {}) => {
    if (!application) return null;
    if (application.status !== 'accepted') return null;

    const task = application.task || (await Task.findByPk(application.taskId));
    if (!task) return null;

    // Default the target end date from the task's advertised duration, counted
    // from when the student was accepted.
    let targetEndDate = null;
    const from = application.decidedAt ? new Date(application.decidedAt) : new Date();
    const unitDays = { days: 1, weeks: 7, months: 30 };
    if (task.durationValue && unitDays[task.durationUnit]) {
        targetEndDate = new Date(
            from.getTime() + task.durationValue * unitDays[task.durationUnit] * DAY_MS
        )
            .toISOString()
            .slice(0, 10);
    }

    const [progress] = await InternshipProgress.findOrCreate({
        where: { applicationId: application.id },
        defaults: {
            applicationId: application.id,
            studentId: application.studentId,
            taskId: application.taskId,
            companyId: task.companyId,
            status: 'not_started',
            startDate: from.toISOString().slice(0, 10),
            targetEndDate,
            expectedHoursPerWeek: application.availabilityHoursPerWeek || null
        },
        transaction: options.transaction
    });

    return progress;
};

// Exposed so applicationController can create the record at the moment of
// acceptance rather than waiting for someone to open the page.
exports.ensureProgressForApplication = ensureProgressForApplication;

// Loads a progress row and the actor together, applying view authorisation.
// Returns { progress, actor } or throws an ErrorResponse via `next`.
const loadProgressForActor = async (progressId, user, { includeRelations = true } = {}) => {
    const progress = await InternshipProgress.findByPk(progressId, {
        include: includeRelations ? progressIncludes() : []
    });
    if (!progress) return { error: new ErrorResponse('Progress record not found', 404) };

    const actor = await resolveActor(user, progress.applicationId);
    if (!progress.canBeViewedBy(actor)) {
        return { error: new ErrorResponse('Not authorized to view this internship', 403) };
    }
    return { progress, actor };
};

// Recompute + fire the at-risk alert only when health actually changes for the
// worse. Without this guard every page load would mail the supervisors.
const recalcAndAlert = async (progressId, options = {}) => {
    const before = await InternshipProgress.findByPk(progressId, {
        attributes: ['id', 'healthStatus'],
        transaction: options.transaction
    });
    const beforeHealth = before ? before.healthStatus : null;

    const progress = await recalcProgressMetrics(progressId, options);
    if (!progress) return null;

    const worsened =
        progress.healthStatus !== beforeHealth &&
        ['at_risk', 'overdue'].includes(progress.healthStatus);

    if (worsened && !options.suppressAlerts) {
        const reasons = [];
        if (progress.overdueMilestoneCount > 0) {
            reasons.push(`${progress.overdueMilestoneCount} milestone(s) past their due date`);
        }
        if (progress.openBlockerCount > 0) {
            reasons.push(`${progress.openBlockerCount} unresolved blocker(s)`);
        }
        if (progress.isPastTargetEnd()) {
            reasons.push('the target end date has passed');
        }
        if (reasons.length === 0) reasons.push('progress has fallen behind the planned schedule');
        notifySupervisorsOfRisk(progress.id, progress.healthStatus, reasons);
    }

    return progress;
};

// A student never sees the private review scores companies leave on other
// records; nothing else is stripped, since transparency is the point of the
// module. Kept as one function so every response path strips identically.
const shapeForActor = (progress, actor) => {
    const json = progress.toJSON ? progress.toJSON() : progress;
    if (actor.role === 'student') {
        delete json.performanceRating;
    }
    return json;
};

// ---------------------------------------------------------------------------
// Container: read, plan, status
// ---------------------------------------------------------------------------

// @desc    Progress for one application (created on first read if missing)
// @route   GET /api/progress/applications/:applicationId
// @access  Private (owning student | owning company | assigned mentor | admin)
exports.getProgressForApplication = async (req, res, next) => {
    try {
        const application = await Application.findByPk(req.params.applicationId, {
            include: [{ model: Task, as: 'task' }]
        });
        if (!application) return next(new ErrorResponse('Application not found', 404));

        const actor = await resolveActor(req.user, application.id);

        // Authorise against the application before creating anything, so a
        // stranger cannot cause rows to be written by probing IDs.
        const isOwningStudent =
            actor.role === 'student' &&
            actor.studentId != null &&
            String(application.studentId) === String(actor.studentId);
        const isOwningCompany =
            actor.role === 'company' &&
            actor.companyId != null &&
            application.task &&
            String(application.task.companyId) === String(actor.companyId);

        if (!isOwningStudent && !isOwningCompany && !actor.isAssignedMentor && actor.role !== 'admin') {
            return next(new ErrorResponse('Not authorized for this application', 403));
        }

        if (application.status !== 'accepted') {
            return next(
                new ErrorResponse(
                    'Progress tracking starts once the application has been accepted',
                    400
                )
            );
        }

        const created = await ensureProgressForApplication(application);
        if (!created) return next(new ErrorResponse('Could not open the internship record', 400));

        await syncProgressMentor(created);
        await recalcAndAlert(created.id);

        const progress = await InternshipProgress.findByPk(created.id, {
            include: progressIncludes()
        });

        res.status(200).json({ success: true, data: shapeForActor(progress, actor) });
    } catch (error) {
        next(error);
    }
};

// @desc    One progress record with its milestones and recent activity
// @route   GET /api/progress/:id
// @access  Private (participants)
exports.getProgress = async (req, res, next) => {
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user);
        if (error) return next(error);

        await syncProgressMentor(progress);
        await recalcAndAlert(progress.id);

        const fresh = await InternshipProgress.findByPk(progress.id, {
            include: progressIncludes().concat([
                {
                    model: ProgressMilestone,
                    as: 'milestones',
                    separate: true,
                    order: [['orderIndex', 'ASC'], ['id', 'ASC']],
                    include: [
                        {
                            model: MilestoneSubmission,
                            as: 'submissions',
                            separate: true,
                            order: [['attemptNumber', 'DESC']]
                        }
                    ]
                },
                {
                    model: ProgressUpdate,
                    as: 'updates',
                    separate: true,
                    limit: 20,
                    order: [['createdAt', 'DESC']],
                    include: [{ model: User, as: 'author', attributes: ['id', 'avatar'] }]
                },
                {
                    model: ProgressStatusHistory,
                    as: 'statusHistory',
                    separate: true,
                    order: [['createdAt', 'ASC']]
                }
            ])
        });

        const json = shapeForActor(fresh, actor);
        json.permissions = {
            canWork: fresh.canBeWorkedOnBy(actor),
            canSupervise: fresh.canBeSupervisedBy(actor),
            canEditPlan: fresh.canPlanBeEditedBy(actor),
            canChangeStatus: fresh.canStatusBeChangedBy(actor),
            canClose: fresh.canBeClosedBy(actor)
        };

        res.status(200).json({ success: true, data: json });
    } catch (error) {
        next(error);
    }
};

// @desc    Edit the plan header: dates, objective, weekly hours
// @route   PUT /api/progress/:id
// @access  Private (owning company | active mentor | admin)
exports.updateProgress = async (req, res, next) => {
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) return next(error);

        if (!progress.canPlanBeEditedBy(actor)) {
            return next(
                new ErrorResponse('You cannot edit the plan for this internship', 403)
            );
        }

        const startDate =
            req.body.startDate !== undefined ? asDateOnly(req.body.startDate) : progress.startDate;
        const targetEndDate =
            req.body.targetEndDate !== undefined
                ? asDateOnly(req.body.targetEndDate)
                : progress.targetEndDate;

        if (startDate && targetEndDate && new Date(targetEndDate) < new Date(startDate)) {
            return next(new ErrorResponse('The target end date cannot be before the start date', 400));
        }

        if (req.body.startDate !== undefined) progress.startDate = startDate;
        if (req.body.targetEndDate !== undefined) progress.targetEndDate = targetEndDate;
        if (req.body.objective !== undefined) progress.objective = req.body.objective || null;
        if (req.body.expectedHoursPerWeek !== undefined) {
            progress.expectedHoursPerWeek =
                req.body.expectedHoursPerWeek === null || req.body.expectedHoursPerWeek === ''
                    ? null
                    : req.body.expectedHoursPerWeek;
        }

        await progress.save();
        await recalcAndAlert(progress.id);

        const fresh = await InternshipProgress.findByPk(progress.id, { include: progressIncludes() });
        res.status(200).json({
            success: true,
            message: 'Internship plan updated',
            data: shapeForActor(fresh, actor)
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Pause, resume or abandon an internship
// @route   PUT /api/progress/:id/status
// @access  Private (owning company | admin)
exports.updateProgressStatus = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) { await t.rollback(); return next(error); }

        if (!progress.canStatusBeChangedBy(actor)) {
            await t.rollback();
            return next(new ErrorResponse('Only the hiring company can change this status', 403));
        }

        const { status, reason } = req.body;

        // Completion has its own endpoint because it writes a final report;
        // routing it here would skip the outstanding-work check.
        if (status === 'completed') {
            await t.rollback();
            return next(
                new ErrorResponse('Use the complete endpoint to close an internship out', 400)
            );
        }

        const from = progress.status;
        if (from === status) {
            await t.rollback();
            return next(new ErrorResponse(`The internship is already ${status}`, 400));
        }
        if (InternshipProgress.TERMINAL_STATUSES.includes(from)) {
            await t.rollback();
            return next(
                new ErrorResponse(`A ${from} internship cannot change status again`, 400)
            );
        }
        if (status === 'not_started') {
            await t.rollback();
            return next(new ErrorResponse('An internship cannot be moved back to not started', 400));
        }
        if (status === 'in_progress' && from !== 'paused') {
            await t.rollback();
            return next(new ErrorResponse('Only a paused internship can be resumed', 400));
        }
        if (status === 'abandoned' && !reason) {
            await t.rollback();
            return next(new ErrorResponse('A reason is required to abandon an internship', 400));
        }

        progress.status = status;
        progress.statusReason = reason || null;
        if (status === 'paused') progress.pausedAt = new Date();
        if (status === 'in_progress') progress.pausedAt = null;
        if (status === 'abandoned') {
            progress.abandonedAt = new Date();
            progress.actualEndDate = todayIso();
        }
        await progress.save({ transaction: t });

        await logTransition(
            progress.id,
            { fromStatus: from, toStatus: status, userId: req.user.id, role: actor.role, reason },
            t
        );
        await t.commit();

        // Recompute after the commit: health depends on the new status.
        await recalcAndAlert(progress.id, { suppressAlerts: true });
        notifyOfStatusChange(progress.id, status, reason || null);

        const fresh = await InternshipProgress.findByPk(progress.id, { include: progressIncludes() });
        res.status(200).json({
            success: true,
            message: `Internship ${status.replace('_', ' ')}`,
            data: shapeForActor(fresh, actor)
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// @desc    Close an internship out with a final report
// @route   PUT /api/progress/:id/complete
// @access  Private (owning company | active mentor | admin)
exports.completeProgress = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) { await t.rollback(); return next(error); }

        if (!progress.canBeClosedBy(actor)) {
            await t.rollback();
            return next(
                new ErrorResponse('You cannot close this internship, or it is already closed', 403)
            );
        }

        // Required work still open blocks completion unless the closer says
        // explicitly that they accept it — and that fact is then recorded.
        const outstanding = await ProgressMilestone.findAll({
            where: {
                progressId: progress.id,
                isRequired: true,
                status: { [Op.in]: ProgressMilestone.OUTSTANDING_STATUSES }
            },
            attributes: ['id', 'title', 'status']
        });

        const acknowledge = req.body.acknowledgeIncomplete === true;
        if (outstanding.length > 0 && !acknowledge) {
            await t.rollback();
            return next(
                new ErrorResponse(
                    `${outstanding.length} required milestone(s) are still open. ` +
                    'Resolve them, or resend with acknowledgeIncomplete to close anyway.',
                    400
                )
            );
        }

        const from = progress.status;
        progress.status = 'completed';
        progress.completedAt = new Date();
        progress.actualEndDate = todayIso();
        progress.closedWithOutstandingWork = outstanding.length > 0;
        if (req.body.completionNote !== undefined) {
            progress.completionNote = req.body.completionNote || null;
        }
        if (req.body.performanceRating !== undefined) {
            progress.performanceRating = req.body.performanceRating ?? null;
        }
        await progress.save({ transaction: t });

        await logTransition(
            progress.id,
            {
                fromStatus: from,
                toStatus: 'completed',
                userId: req.user.id,
                role: actor.role,
                reason: outstanding.length > 0 ? 'Closed with outstanding required milestones' : null
            },
            t
        );
        await t.commit();

        await recalcAndAlert(progress.id, { suppressAlerts: true });
        notifyOfCompletion(progress.id);

        const fresh = await InternshipProgress.findByPk(progress.id, { include: progressIncludes() });
        res.status(200).json({
            success: true,
            message: 'Internship marked complete',
            data: {
                ...shapeForActor(fresh, actor),
                outstandingMilestones: outstanding.map((m) => ({
                    _id: String(m.id),
                    title: m.title,
                    status: m.status
                }))
            }
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Role dashboards
// ---------------------------------------------------------------------------

const listFor = async (where, req) => {
    const { page, limit, offset } = paginate(req.query);
    const filters = { ...where };

    const statuses = scopeToStatus(req.query.scope);
    if (statuses) filters.status = { [Op.in]: statuses };
    if (req.query.health && InternshipProgress.HEALTH_STATUSES.includes(req.query.health)) {
        filters.healthStatus = req.query.health;
    }
    if (req.query.taskId) filters.taskId = req.query.taskId;

    const { rows, count } = await InternshipProgress.findAndCountAll({
        where: filters,
        include: progressIncludes(),
        // Trouble first: overdue, then at risk, then most recently touched.
        order: [
            [
                sequelize.literal(
                    "CASE `InternshipProgress`.`healthStatus` " +
                    "WHEN 'overdue' THEN 0 WHEN 'at_risk' THEN 1 ELSE 2 END"
                ),
                'ASC'
            ],
            ['updatedAt', 'DESC']
        ],
        offset,
        limit,
        distinct: true
    });

    return { rows, count, page, limit };
};

// @desc    The logged-in student's internships
// @route   GET /api/progress/student
// @access  Private (student)
exports.getStudentProgress = async (req, res, next) => {
    try {
        const student = await resolveStudent(req.user.id);
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        // Back-fill anything accepted before this module existed, so the list
        // is never mysteriously short.
        await backfillForStudent(student.id);

        const actor = { role: 'student', studentId: student.id, userId: req.user.id };
        const { rows, count, page, limit } = await listFor({ studentId: student.id }, req);

        res.status(200).json({
            success: true,
            data: {
                records: rows.map((r) => shapeForActor(r, actor)),
                pagination: paginationPayload(page, limit, count)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Every internship across the company's tasks
// @route   GET /api/progress/company
// @access  Private (company)
exports.getCompanyProgress = async (req, res, next) => {
    try {
        const company = await resolveCompany(req.user.id);
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        await backfillForCompany(company.id);

        const actor = { role: 'company', companyId: company.id, userId: req.user.id };
        const { rows, count, page, limit } = await listFor({ companyId: company.id }, req);

        res.status(200).json({
            success: true,
            data: {
                records: rows.map((r) => shapeForActor(r, actor)),
                pagination: paginationPayload(page, limit, count)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Internships the logged-in mentor is guiding
// @route   GET /api/progress/mentor
// @access  Private (mentor)
exports.getMentorProgress = async (req, res, next) => {
    try {
        const mentor = await resolveMentor(req.user.id);
        if (!mentor) return next(new ErrorResponse('Mentor profile not found', 404));

        // Scope is derived from mentor_assignments, not the cached mentorId, so
        // an assignment accepted a moment ago shows up immediately.
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

        await backfillForApplications(applicationIds);

        const actor = {
            role: 'mentor',
            mentorId: mentor.id,
            userId: req.user.id,
            isAssignedMentor: true
        };
        const { rows, count, page, limit } = await listFor(
            { applicationId: { [Op.in]: applicationIds } },
            req
        );

        res.status(200).json({
            success: true,
            data: {
                records: rows.map((r) => shapeForActor(r, actor)),
                pagination: paginationPayload(page, limit, count)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Aggregate counters for the caller's own dashboard
// @route   GET /api/progress/overview
// @access  Private (student | company | mentor | admin)
exports.getProgressOverview = async (req, res, next) => {
    try {
        const where = {};

        if (req.user.role === 'student') {
            const student = await resolveStudent(req.user.id);
            if (!student) return next(new ErrorResponse('Student profile not found', 404));
            where.studentId = student.id;
        } else if (req.user.role === 'company') {
            const company = await resolveCompany(req.user.id);
            if (!company) return next(new ErrorResponse('Company profile not found', 404));
            where.companyId = company.id;
        } else if (req.user.role === 'mentor') {
            const mentor = await resolveMentor(req.user.id);
            if (!mentor) return next(new ErrorResponse('Mentor profile not found', 404));
            const assignments = await MentorAssignment.findAll({
                where: { mentorId: mentor.id, status: { [Op.in]: ['active', 'completed'] } },
                attributes: ['applicationId']
            });
            const ids = assignments.map((a) => a.applicationId);
            if (ids.length === 0) {
                return res.status(200).json({ success: true, data: emptyOverview() });
            }
            where.applicationId = { [Op.in]: ids };
        }
        // admin: no filter — the whole platform.

        const records = await InternshipProgress.findAll({
            where,
            attributes: [
                'id', 'status', 'healthStatus', 'progressPercent',
                'totalHoursLogged', 'openBlockerCount', 'overdueMilestoneCount'
            ]
        });

        const statusCounts = InternshipProgress.STATUSES.reduce((acc, s) => {
            acc[s] = 0;
            return acc;
        }, {});
        const healthCounts = InternshipProgress.HEALTH_STATUSES.reduce((acc, h) => {
            acc[h] = 0;
            return acc;
        }, {});

        let totalHours = 0;
        let percentSum = 0;
        let openBlockers = 0;
        let overdueMilestones = 0;

        records.forEach((r) => {
            statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
            // Health only means anything on a live internship.
            if (!InternshipProgress.TERMINAL_STATUSES.includes(r.status)) {
                healthCounts[r.healthStatus] = (healthCounts[r.healthStatus] || 0) + 1;
            }
            totalHours += Number(r.totalHoursLogged) || 0;
            percentSum += Number(r.progressPercent) || 0;
            openBlockers += Number(r.openBlockerCount) || 0;
            overdueMilestones += Number(r.overdueMilestoneCount) || 0;
        });

        // Submissions this caller could act on right now.
        const pendingReview = records.length
            ? await MilestoneSubmission.count({
                where: {
                    progressId: { [Op.in]: records.map((r) => r.id) },
                    status: 'pending_review'
                }
            })
            : 0;

        res.status(200).json({
            success: true,
            data: {
                total: records.length,
                statusCounts,
                healthCounts,
                averageProgress: records.length ? Math.round(percentSum / records.length) : 0,
                totalHoursLogged: Math.round(totalHours * 100) / 100,
                openBlockers,
                overdueMilestones,
                submissionsAwaitingReview: pendingReview,
                needsAttention: healthCounts.at_risk + healthCounts.overdue
            }
        });
    } catch (error) {
        next(error);
    }
};

const emptyOverview = () => ({
    total: 0,
    statusCounts: InternshipProgress.STATUSES.reduce((a, s) => ({ ...a, [s]: 0 }), {}),
    healthCounts: InternshipProgress.HEALTH_STATUSES.reduce((a, h) => ({ ...a, [h]: 0 }), {}),
    averageProgress: 0,
    totalHoursLogged: 0,
    openBlockers: 0,
    overdueMilestones: 0,
    submissionsAwaitingReview: 0,
    needsAttention: 0
});

// ---------------------------------------------------------------------------
// Back-fill helpers
//
// Applications accepted before Module 8 shipped have no progress row. Rather
// than a migration script that must be remembered, each list endpoint tops up
// its own scope. findOrCreate makes this idempotent and cheap after the first
// call, because the query below returns nothing once every row exists.
// ---------------------------------------------------------------------------

const backfillFromApplications = async (applications) => {
    for (const application of applications) {
        try {
            await ensureProgressForApplication(application);
        } catch (err) {
            console.warn('[progress] backfill failed for application', application.id, err.message);
        }
    }
};

const backfillForStudent = async (studentId) => {
    const accepted = await Application.findAll({
        where: { studentId, status: 'accepted' },
        include: [
            { model: Task, as: 'task' },
            { model: InternshipProgress, as: 'progress', attributes: ['id'], required: false }
        ]
    });
    await backfillFromApplications(accepted.filter((a) => !a.progress));
};

const backfillForCompany = async (companyId) => {
    const accepted = await Application.findAll({
        where: { status: 'accepted' },
        include: [
            { model: Task, as: 'task', where: { companyId }, required: true },
            { model: InternshipProgress, as: 'progress', attributes: ['id'], required: false }
        ]
    });
    await backfillFromApplications(accepted.filter((a) => !a.progress));
};

const backfillForApplications = async (applicationIds) => {
    const accepted = await Application.findAll({
        where: { id: { [Op.in]: applicationIds }, status: 'accepted' },
        include: [
            { model: Task, as: 'task' },
            { model: InternshipProgress, as: 'progress', attributes: ['id'], required: false }
        ]
    });
    await backfillFromApplications(accepted.filter((a) => !a.progress));
};

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

const loadMilestone = async (progressId, milestoneId) =>
    ProgressMilestone.findOne({ where: { id: milestoneId, progressId } });

// @desc    List the milestone plan
// @route   GET /api/progress/:id/milestones
// @access  Private (participants)
exports.getMilestones = async (req, res, next) => {
    try {
        const { progress, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) return next(error);

        const milestones = await ProgressMilestone.findAll({
            where: { progressId: progress.id },
            order: [['orderIndex', 'ASC'], ['id', 'ASC']],
            include: [
                {
                    model: MilestoneSubmission,
                    as: 'submissions',
                    separate: true,
                    order: [['attemptNumber', 'DESC']]
                }
            ]
        });

        res.status(200).json({
            success: true,
            data: { milestones: milestones.map((m) => m.toJSON()), count: milestones.length }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add a milestone to the plan
// @route   POST /api/progress/:id/milestones
// @access  Private (owning company | active mentor | admin)
exports.createMilestone = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) { await t.rollback(); return next(error); }

        if (!progress.canPlanBeEditedBy(actor)) {
            await t.rollback();
            return next(
                new ErrorResponse(
                    'Only the hiring company or the assigned mentor can add milestones, ' +
                    'and only while the internship is open',
                    403
                )
            );
        }

        const dueDate = asDateOnly(req.body.dueDate);
        if (dueDate && progress.startDate && new Date(dueDate) < new Date(progress.startDate)) {
            await t.rollback();
            return next(
                new ErrorResponse('A milestone cannot be due before the internship starts', 400)
            );
        }

        // Append to the end of the plan unless a position was given.
        const maxOrder = await ProgressMilestone.max('orderIndex', {
            where: { progressId: progress.id },
            transaction: t
        });
        const orderIndex =
            req.body.orderIndex != null
                ? req.body.orderIndex
                : (Number.isFinite(maxOrder) ? maxOrder + 1 : 0);

        const milestone = await ProgressMilestone.create(
            {
                progressId: progress.id,
                title: req.body.title,
                description: req.body.description || null,
                orderIndex,
                weight: req.body.weight != null ? req.body.weight : 1,
                isRequired: req.body.isRequired !== false,
                dueDate,
                estimatedHours:
                    req.body.estimatedHours != null && req.body.estimatedHours !== ''
                        ? req.body.estimatedHours
                        : null,
                createdByUserId: req.user.id,
                createdByRole: actor.role,
                status: 'pending'
            },
            { transaction: t }
        );

        await logTransition(
            progress.id,
            {
                milestoneId: milestone.id,
                milestoneTitle: milestone.title,
                fromStatus: null,
                toStatus: 'pending',
                userId: req.user.id,
                role: actor.role
            },
            t
        );
        await t.commit();

        await recalcAndAlert(progress.id);
        notifyStudentOfMilestone(progress.id, milestone.id, await actorDisplayName(actor));

        const fresh = await ProgressMilestone.findByPk(milestone.id);
        res.status(201).json({
            success: true,
            message: 'Milestone added',
            data: fresh.toJSON()
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// @desc    Edit a milestone's definition
// @route   PUT /api/progress/:id/milestones/:milestoneId
// @access  Private (owning company | active mentor | admin)
exports.updateMilestone = async (req, res, next) => {
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) return next(error);

        if (!progress.canPlanBeEditedBy(actor)) {
            return next(new ErrorResponse('You cannot edit this milestone', 403));
        }

        const milestone = await loadMilestone(progress.id, req.params.milestoneId);
        if (!milestone) return next(new ErrorResponse('Milestone not found', 404));

        if (req.body.dueDate !== undefined) {
            const dueDate = asDateOnly(req.body.dueDate);
            if (dueDate && progress.startDate && new Date(dueDate) < new Date(progress.startDate)) {
                return next(
                    new ErrorResponse('A milestone cannot be due before the internship starts', 400)
                );
            }
            milestone.dueDate = dueDate;
        }
        if (req.body.title !== undefined) milestone.title = req.body.title;
        if (req.body.description !== undefined) milestone.description = req.body.description || null;
        if (req.body.weight !== undefined) milestone.weight = req.body.weight;
        if (req.body.isRequired !== undefined) milestone.isRequired = !!req.body.isRequired;
        if (req.body.orderIndex !== undefined) milestone.orderIndex = req.body.orderIndex;
        if (req.body.estimatedHours !== undefined) {
            milestone.estimatedHours =
                req.body.estimatedHours === null || req.body.estimatedHours === ''
                    ? null
                    : req.body.estimatedHours;
        }

        await milestone.save();
        await recalcAndAlert(progress.id);

        res.status(200).json({
            success: true,
            message: 'Milestone updated',
            data: (await ProgressMilestone.findByPk(milestone.id)).toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Remove a milestone from the plan
// @route   DELETE /api/progress/:id/milestones/:milestoneId
// @access  Private (owning company | active mentor | admin)
exports.deleteMilestone = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) { await t.rollback(); return next(error); }

        if (!progress.canPlanBeEditedBy(actor)) {
            await t.rollback();
            return next(new ErrorResponse('You cannot delete this milestone', 403));
        }

        const milestone = await loadMilestone(progress.id, req.params.milestoneId);
        if (!milestone) { await t.rollback(); return next(new ErrorResponse('Milestone not found', 404)); }

        // Deleting work a student already did would erase their record, so the
        // reviewed states are cancelled instead of removed.
        if (['completed', 'submitted'].includes(milestone.status)) {
            await t.rollback();
            return next(
                new ErrorResponse(
                    `A ${milestone.status} milestone cannot be deleted — cancel it instead ` +
                    'so the submission history is preserved.',
                    400
                )
            );
        }
        if (milestone.submissionCount > 0) {
            await t.rollback();
            return next(
                new ErrorResponse(
                    'This milestone already has submissions — cancel it instead of deleting it.',
                    400
                )
            );
        }

        await logTransition(
            progress.id,
            {
                milestoneTitle: milestone.title,
                fromStatus: milestone.status,
                toStatus: 'deleted',
                userId: req.user.id,
                role: actor.role
            },
            t
        );
        await milestone.destroy({ transaction: t });
        await t.commit();

        await recalcAndAlert(progress.id);

        res.status(200).json({ success: true, message: 'Milestone deleted' });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// @desc    Reorder the plan
// @route   PUT /api/progress/:id/milestones/reorder
// @access  Private (owning company | active mentor | admin)
exports.reorderMilestones = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) { await t.rollback(); return next(error); }

        if (!progress.canPlanBeEditedBy(actor)) {
            await t.rollback();
            return next(new ErrorResponse('You cannot reorder this plan', 403));
        }

        const order = req.body.milestoneIds;
        const existing = await ProgressMilestone.findAll({
            where: { progressId: progress.id },
            attributes: ['id'],
            transaction: t
        });
        const existingIds = new Set(existing.map((m) => String(m.id)));

        // Reject a partial list outright: silently leaving milestones behind
        // would produce a plan whose order depends on insertion history.
        if (order.length !== existingIds.size || !order.every((id) => existingIds.has(String(id)))) {
            await t.rollback();
            return next(
                new ErrorResponse(
                    'The reorder list must contain every milestone on this internship exactly once',
                    400
                )
            );
        }
        if (new Set(order.map(String)).size !== order.length) {
            await t.rollback();
            return next(new ErrorResponse('The reorder list contains duplicate milestones', 400));
        }

        for (let i = 0; i < order.length; i += 1) {
            await ProgressMilestone.update(
                { orderIndex: i },
                { where: { id: order[i], progressId: progress.id }, transaction: t }
            );
        }
        await t.commit();

        const milestones = await ProgressMilestone.findAll({
            where: { progressId: progress.id },
            order: [['orderIndex', 'ASC'], ['id', 'ASC']]
        });

        res.status(200).json({
            success: true,
            message: 'Plan reordered',
            data: { milestones: milestones.map((m) => m.toJSON()) }
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// Shared transition writer for every milestone status change.
const applyMilestoneTransition = async (
    { progress, milestone, actor, userId, toStatus, reason },
    t
) => {
    const from = milestone.status;
    if (!ProgressMilestone.canTransition(from, toStatus)) {
        return {
            error: new ErrorResponse(
                `A milestone cannot go from '${from}' to '${toStatus}'. ` +
                `Allowed from here: ${ProgressMilestone.allowedTransitions(from).join(', ') || 'none'}.`,
                400
            )
        };
    }

    milestone.status = toStatus;
    const now = new Date();

    if (toStatus === 'in_progress' && !milestone.startedAt) milestone.startedAt = now;
    if (toStatus === 'submitted') {
        // Submitting straight from 'pending' still counts as having started it.
        if (!milestone.startedAt) milestone.startedAt = now;
        milestone.submittedAt = now;
    }
    if (toStatus === 'completed') milestone.completedAt = now;
    if (toStatus === 'blocked') {
        milestone.blockedAt = now;
        milestone.blockedReason = reason || null;
    }
    if (from === 'blocked' && toStatus !== 'blocked') {
        milestone.blockedAt = null;
        milestone.blockedReason = null;
    }
    // Reopening clears the previous completion so the record is not misleading.
    if (from === 'completed' && toStatus !== 'completed') milestone.completedAt = null;

    await milestone.save({ transaction: t });
    await logTransition(
        progress.id,
        {
            milestoneId: milestone.id,
            milestoneTitle: milestone.title,
            fromStatus: from,
            toStatus,
            userId,
            role: actor.role,
            reason
        },
        t
    );

    return { from };
};

// @desc    Student starts working on a milestone
// @route   PUT /api/progress/:id/milestones/:milestoneId/start
// @access  Private (the student on this internship)
exports.startMilestone = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) { await t.rollback(); return next(error); }

        if (!progress.canBeWorkedOnBy(actor)) {
            await t.rollback();
            return next(
                new ErrorResponse(
                    'Only the student on an open, unpaused internship can start a milestone',
                    403
                )
            );
        }

        const milestone = await loadMilestone(progress.id, req.params.milestoneId);
        if (!milestone) { await t.rollback(); return next(new ErrorResponse('Milestone not found', 404)); }

        // The raw transition map allows completed -> in_progress so a *reviewer*
        // can reopen an approval. A student must not reach that path, or they
        // could reopen their own approved work and move their own percentage.
        if (!milestone.canBeStartedByStudent()) {
            await t.rollback();
            return next(
                new ErrorResponse(
                    `A milestone can only be started from 'pending' or 'changes_requested' — ` +
                    `this one is '${milestone.status}'`,
                    400
                )
            );
        }

        const result = await applyMilestoneTransition(
            { progress, milestone, actor, userId: req.user.id, toStatus: 'in_progress' },
            t
        );
        if (result.error) { await t.rollback(); return next(result.error); }

        await t.commit();
        await recalcAndAlert(progress.id, { touchActivity: true });

        res.status(200).json({
            success: true,
            message: 'Milestone started',
            data: (await ProgressMilestone.findByPk(milestone.id)).toJSON()
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// @desc    Student submits a milestone for review
// @route   POST /api/progress/:id/milestones/:milestoneId/submit
// @access  Private (the student on this internship)
exports.submitMilestone = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) { await t.rollback(); return next(error); }

        if (!progress.canBeWorkedOnBy(actor)) {
            await t.rollback();
            return next(
                new ErrorResponse(
                    'Only the student on an open, unpaused internship can submit work',
                    403
                )
            );
        }

        const milestone = await loadMilestone(progress.id, req.params.milestoneId);
        if (!milestone) { await t.rollback(); return next(new ErrorResponse('Milestone not found', 404)); }

        if (milestone.status === 'submitted') {
            await t.rollback();
            return next(
                new ErrorResponse('This milestone is already awaiting review', 400)
            );
        }
        if (milestone.status === 'blocked') {
            await t.rollback();
            return next(
                new ErrorResponse('Clear the blocker on this milestone before submitting', 400)
            );
        }

        // Earlier attempts stay in the table as history; only the newest is live.
        await MilestoneSubmission.update(
            { status: 'superseded' },
            {
                where: { milestoneId: milestone.id, status: 'pending_review' },
                transaction: t
            }
        );

        const attemptNumber = (Number(milestone.submissionCount) || 0) + 1;
        const submission = await MilestoneSubmission.create(
            {
                milestoneId: milestone.id,
                progressId: progress.id,
                studentId: progress.studentId,
                attemptNumber,
                summary: req.body.summary,
                deliverableUrl: req.body.deliverableUrl || null,
                repositoryUrl: req.body.repositoryUrl || null,
                demoUrl: req.body.demoUrl || null,
                hoursSpent:
                    req.body.hoursSpent != null && req.body.hoursSpent !== ''
                        ? req.body.hoursSpent
                        : null,
                status: 'pending_review',
                submittedAt: new Date(),
                wasLate: milestone.isOverdue()
            },
            { transaction: t }
        );

        milestone.submissionCount = attemptNumber;
        const result = await applyMilestoneTransition(
            { progress, milestone, actor, userId: req.user.id, toStatus: 'submitted' },
            t
        );
        if (result.error) { await t.rollback(); return next(result.error); }

        await t.commit();
        await recalcAndAlert(progress.id, { touchActivity: true });
        notifyReviewersOfSubmission(progress.id, submission.id);

        res.status(201).json({
            success: true,
            message: 'Milestone submitted for review',
            data: {
                submission: (await MilestoneSubmission.findByPk(submission.id)).toJSON(),
                milestone: (await ProgressMilestone.findByPk(milestone.id)).toJSON()
            }
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// @desc    Approve a submitted milestone or send it back for changes
// @route   PUT /api/progress/:id/milestones/:milestoneId/review
// @access  Private (owning company | active mentor | admin)
exports.reviewMilestone = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) { await t.rollback(); return next(error); }

        if (!progress.canBeSupervisedBy(actor)) {
            await t.rollback();
            return next(
                new ErrorResponse(
                    'Only the hiring company or the assigned mentor can review submissions',
                    403
                )
            );
        }

        const milestone = await loadMilestone(progress.id, req.params.milestoneId);
        if (!milestone) { await t.rollback(); return next(new ErrorResponse('Milestone not found', 404)); }

        if (!milestone.canBeReviewed()) {
            await t.rollback();
            return next(
                new ErrorResponse(
                    `Only a submitted milestone can be reviewed — this one is '${milestone.status}'`,
                    400
                )
            );
        }

        const { action, note, score } = req.body;
        const approved = action === 'approve';
        const now = new Date();
        const reviewerName = await actorDisplayName(actor);

        const submission = await MilestoneSubmission.findOne({
            where: { milestoneId: milestone.id, status: 'pending_review' },
            order: [['attemptNumber', 'DESC']],
            transaction: t
        });

        if (submission) {
            submission.status = approved ? 'approved' : 'changes_requested';
            submission.reviewedByUserId = req.user.id;
            submission.reviewerRole = actor.role;
            submission.reviewerName = reviewerName;
            submission.reviewNote = note || null;
            submission.reviewScore = score != null ? score : null;
            submission.reviewedAt = now;
            await submission.save({ transaction: t });
        }

        milestone.reviewedByUserId = req.user.id;
        milestone.reviewerRole = actor.role;
        milestone.reviewNote = note || null;
        milestone.reviewedAt = now;

        const result = await applyMilestoneTransition(
            {
                progress,
                milestone,
                actor,
                userId: req.user.id,
                toStatus: approved ? 'completed' : 'changes_requested',
                reason: note
            },
            t
        );
        if (result.error) { await t.rollback(); return next(result.error); }

        await t.commit();
        await recalcAndAlert(progress.id, { touchActivity: true });
        notifyStudentOfReview(progress.id, milestone.id, approved, reviewerName, note || null);

        res.status(200).json({
            success: true,
            message: approved ? 'Milestone approved' : 'Changes requested',
            data: {
                milestone: (await ProgressMilestone.findByPk(milestone.id)).toJSON(),
                submission: submission
                    ? (await MilestoneSubmission.findByPk(submission.id)).toJSON()
                    : null
            }
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// @desc    Change a milestone's status directly (block, unblock, cancel, reopen)
// @route   PUT /api/progress/:id/milestones/:milestoneId/status
// @access  Private (student may block/unblock; supervisors may do all of it)
exports.setMilestoneStatus = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) { await t.rollback(); return next(error); }

        const milestone = await loadMilestone(progress.id, req.params.milestoneId);
        if (!milestone) { await t.rollback(); return next(new ErrorResponse('Milestone not found', 404)); }

        const { status, reason } = req.body;
        const isSupervisor = progress.canBeSupervisedBy(actor);
        const isWorker = progress.canBeWorkedOnBy(actor);

        // A student may only raise or clear their own blocker. Cancelling,
        // reopening and approving stay with the supervisors.
        const STUDENT_ALLOWED = ['blocked', 'in_progress', 'pending'];
        if (!isSupervisor) {
            if (!isWorker) {
                await t.rollback();
                return next(new ErrorResponse('You cannot change this milestone', 403));
            }
            if (!STUDENT_ALLOWED.includes(status)) {
                await t.rollback();
                return next(
                    new ErrorResponse(
                        `As the student you can only move a milestone to: ${STUDENT_ALLOWED.join(', ')}`,
                        403
                    )
                );
            }
            // Reopening an approved milestone is a reviewer's call, even though
            // the transition map permits it — otherwise a student could undo
            // their own approval and change their own completion percentage.
            if (milestone.status === 'completed') {
                await t.rollback();
                return next(
                    new ErrorResponse(
                        'Only the company or your mentor can reopen an approved milestone',
                        403
                    )
                );
            }
        }

        if (status === 'blocked' && !reason) {
            await t.rollback();
            return next(new ErrorResponse('Describe what is blocking you', 400));
        }
        if (status === 'completed') {
            await t.rollback();
            return next(
                new ErrorResponse('Approve the submission instead of setting completed directly', 400)
            );
        }
        if (status === 'submitted') {
            await t.rollback();
            return next(new ErrorResponse('Use the submit endpoint to hand work in', 400));
        }

        const wasBlocked = milestone.status === 'blocked';
        const result = await applyMilestoneTransition(
            { progress, milestone, actor, userId: req.user.id, toStatus: status, reason },
            t
        );
        if (result.error) { await t.rollback(); return next(result.error); }

        // A blocked milestone also opens a blocker on the timeline, so the
        // supervisors see it in one place with everything else.
        let raisedUpdate = null;
        if (status === 'blocked') {
            raisedUpdate = await ProgressUpdate.create(
                {
                    progressId: progress.id,
                    milestoneId: milestone.id,
                    authorUserId: req.user.id,
                    authorRole: actor.role,
                    authorName: await actorDisplayName(actor),
                    type: 'blocker',
                    body: reason,
                    isSystemGenerated: false
                },
                { transaction: t }
            );
        } else if (wasBlocked) {
            await ProgressUpdate.update(
                {
                    resolvedAt: new Date(),
                    resolvedByUserId: req.user.id,
                    resolutionNote: reason || 'Milestone unblocked'
                },
                {
                    where: { milestoneId: milestone.id, type: 'blocker', resolvedAt: null },
                    transaction: t
                }
            );
        }

        await t.commit();
        await recalcAndAlert(progress.id, { touchActivity: true });

        if (raisedUpdate) {
            notifySupervisorsOfBlocker(progress.id, {
                milestoneTitle: milestone.title,
                body: reason
            });
        } else if (wasBlocked) {
            notifyOfBlockerResolved(progress.id, {
                milestoneTitle: milestone.title,
                resolutionNote: reason || null
            });
        }

        res.status(200).json({
            success: true,
            message: `Milestone moved to ${status.replace('_', ' ')}`,
            data: (await ProgressMilestone.findByPk(milestone.id)).toJSON()
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// @desc    Every submission attempt on one milestone
// @route   GET /api/progress/:id/milestones/:milestoneId/submissions
// @access  Private (participants)
exports.getMilestoneSubmissions = async (req, res, next) => {
    try {
        const { progress, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) return next(error);

        const milestone = await loadMilestone(progress.id, req.params.milestoneId);
        if (!milestone) return next(new ErrorResponse('Milestone not found', 404));

        const submissions = await MilestoneSubmission.findAll({
            where: { milestoneId: milestone.id },
            order: [['attemptNumber', 'DESC']],
            include: [{ model: User, as: 'reviewer', attributes: ['id', 'avatar'] }]
        });

        res.status(200).json({
            success: true,
            data: { submissions: submissions.map((s) => s.toJSON()), count: submissions.length }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Everything on this internship still waiting on a reviewer
// @route   GET /api/progress/:id/submissions
// @access  Private (participants)
exports.getPendingSubmissions = async (req, res, next) => {
    try {
        const { progress, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) return next(error);

        const submissions = await MilestoneSubmission.findAll({
            where: { progressId: progress.id, status: 'pending_review' },
            order: [['submittedAt', 'ASC']],
            include: [
                { model: ProgressMilestone, as: 'milestone', attributes: ['id', 'title', 'dueDate'] }
            ]
        });

        res.status(200).json({
            success: true,
            data: { submissions: submissions.map((s) => s.toJSON()), count: submissions.length }
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Time logs
// ---------------------------------------------------------------------------

// @desc    Time logged against this internship
// @route   GET /api/progress/:id/time-logs
// @access  Private (participants)
exports.getTimeLogs = async (req, res, next) => {
    try {
        const { progress, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) return next(error);

        const where = { progressId: progress.id };
        if (req.query.milestoneId) where.milestoneId = req.query.milestoneId;
        if (req.query.from || req.query.to) {
            where.workDate = {};
            if (req.query.from) where.workDate[Op.gte] = asDateOnly(req.query.from);
            if (req.query.to) where.workDate[Op.lte] = asDateOnly(req.query.to);
        }

        const logs = await ProgressTimeLog.findAll({
            where,
            order: [['workDate', 'DESC'], ['id', 'DESC']],
            include: [{ model: ProgressMilestone, as: 'milestone', attributes: ['id', 'title'] }]
        });

        // Daily totals, oldest first — the shape the frontend chart consumes.
        const byDate = new Map();
        logs.forEach((l) => {
            const key = String(l.workDate);
            byDate.set(key, (byDate.get(key) || 0) + Number(l.hours));
        });
        const series = Array.from(byDate.entries())
            .map(([date, hours]) => ({ date, hours: Math.round(hours * 100) / 100 }))
            .sort((a, b) => (a.date < b.date ? -1 : 1));

        const total = logs.reduce((sum, l) => sum + Number(l.hours), 0);

        res.status(200).json({
            success: true,
            data: {
                timeLogs: logs.map((l) => l.toJSON()),
                count: logs.length,
                totalHours: Math.round(total * 100) / 100,
                series
            }
        });
    } catch (error) {
        next(error);
    }
};

// Guards shared by create and update: the day cap and the milestone's ownership.
const validateTimeEntry = async ({ progress, workDate, hours, milestoneId, excludeLogId }) => {
    if (progress.startDate && new Date(workDate) < new Date(progress.startDate)) {
        return new ErrorResponse('You cannot log time before the internship started', 400);
    }
    if (new Date(workDate) > new Date(todayIso())) {
        return new ErrorResponse('You cannot log time for a future date', 400);
    }

    if (milestoneId != null) {
        const milestone = await ProgressMilestone.findOne({
            where: { id: milestoneId, progressId: progress.id }
        });
        if (!milestone) {
            return new ErrorResponse('That milestone does not belong to this internship', 400);
        }
    }

    const where = { progressId: progress.id, workDate };
    if (excludeLogId) where.id = { [Op.ne]: excludeLogId };
    const existing = await ProgressTimeLog.sum('hours', { where });
    const dayTotal = (Number(existing) || 0) + Number(hours);

    if (dayTotal > ProgressTimeLog.MAX_HOURS_PER_DAY) {
        return new ErrorResponse(
            `That would put ${workDate} at ${dayTotal} hours on this internship; ` +
            `the daily cap is ${ProgressTimeLog.MAX_HOURS_PER_DAY}.`,
            400
        );
    }

    return null;
};

// @desc    Log time spent
// @route   POST /api/progress/:id/time-logs
// @access  Private (the student on this internship)
exports.createTimeLog = async (req, res, next) => {
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) return next(error);

        if (!progress.canBeWorkedOnBy(actor)) {
            return next(
                new ErrorResponse(
                    'Only the student on an open, unpaused internship can log time',
                    403
                )
            );
        }

        const workDate = asDateOnly(req.body.workDate) || todayIso();
        const milestoneId = req.body.milestoneId || null;

        const guard = await validateTimeEntry({
            progress,
            workDate,
            hours: req.body.hours,
            milestoneId
        });
        if (guard) return next(guard);

        const log = await ProgressTimeLog.create({
            progressId: progress.id,
            milestoneId,
            studentId: progress.studentId,
            workDate,
            hours: req.body.hours,
            description: req.body.description || null
        });

        if (milestoneId) await recalcMilestoneHours(milestoneId);
        await recalcAndAlert(progress.id, { touchActivity: true });

        res.status(201).json({
            success: true,
            message: 'Time logged',
            data: (await ProgressTimeLog.findByPk(log.id)).toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Edit a time entry
// @route   PUT /api/progress/:id/time-logs/:logId
// @access  Private (the student who logged it | admin)
exports.updateTimeLog = async (req, res, next) => {
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) return next(error);

        const log = await ProgressTimeLog.findOne({
            where: { id: req.params.logId, progressId: progress.id }
        });
        if (!log) return next(new ErrorResponse('Time entry not found', 404));

        if (!log.canBeEditedBy(actor)) {
            return next(new ErrorResponse('You can only edit your own time entries', 403));
        }
        if (!progress.isOpen() && actor.role !== 'admin') {
            return next(
                new ErrorResponse('Time cannot be edited once the internship is closed', 400)
            );
        }

        const previousMilestoneId = log.milestoneId;
        const workDate = req.body.workDate !== undefined
            ? asDateOnly(req.body.workDate)
            : String(log.workDate);
        const hours = req.body.hours !== undefined ? req.body.hours : Number(log.hours);
        const milestoneId =
            req.body.milestoneId !== undefined ? req.body.milestoneId || null : log.milestoneId;

        const guard = await validateTimeEntry({
            progress,
            workDate,
            hours,
            milestoneId,
            excludeLogId: log.id
        });
        if (guard) return next(guard);

        log.workDate = workDate;
        log.hours = hours;
        log.milestoneId = milestoneId;
        if (req.body.description !== undefined) log.description = req.body.description || null;
        await log.save();

        // Both the old and the new milestone need their cached hours redone.
        if (previousMilestoneId) await recalcMilestoneHours(previousMilestoneId);
        if (milestoneId && String(milestoneId) !== String(previousMilestoneId)) {
            await recalcMilestoneHours(milestoneId);
        }
        await recalcAndAlert(progress.id, { touchActivity: true });

        res.status(200).json({
            success: true,
            message: 'Time entry updated',
            data: (await ProgressTimeLog.findByPk(log.id)).toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a time entry
// @route   DELETE /api/progress/:id/time-logs/:logId
// @access  Private (the student who logged it | admin)
exports.deleteTimeLog = async (req, res, next) => {
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) return next(error);

        const log = await ProgressTimeLog.findOne({
            where: { id: req.params.logId, progressId: progress.id }
        });
        if (!log) return next(new ErrorResponse('Time entry not found', 404));

        if (!log.canBeEditedBy(actor)) {
            return next(new ErrorResponse('You can only delete your own time entries', 403));
        }
        if (!progress.isOpen() && actor.role !== 'admin') {
            return next(
                new ErrorResponse('Time cannot be deleted once the internship is closed', 400)
            );
        }

        const milestoneId = log.milestoneId;
        await log.destroy();

        if (milestoneId) await recalcMilestoneHours(milestoneId);
        await recalcAndAlert(progress.id);

        res.status(200).json({ success: true, message: 'Time entry deleted' });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Progress updates (check-ins, blockers, risk flags)
// ---------------------------------------------------------------------------

// @desc    The update timeline
// @route   GET /api/progress/:id/updates
// @access  Private (participants)
exports.getUpdates = async (req, res, next) => {
    try {
        const { progress, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) return next(error);

        const where = { progressId: progress.id };
        if (req.query.type && ProgressUpdate.TYPES.includes(req.query.type)) {
            where.type = req.query.type;
        }
        if (req.query.open === 'true') {
            where.type = { [Op.in]: ProgressUpdate.RESOLVABLE_TYPES };
            where.resolvedAt = null;
        }

        const updates = await ProgressUpdate.findAll({
            where,
            order: [['createdAt', 'DESC']],
            include: [
                { model: User, as: 'author', attributes: ['id', 'avatar'] },
                { model: ProgressMilestone, as: 'milestone', attributes: ['id', 'title'] }
            ]
        });

        res.status(200).json({
            success: true,
            data: {
                updates: updates.map((u) => u.toJSON()),
                count: updates.length,
                openCount: updates.filter((u) => u.isOpen()).length
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Post a check-in, blocker, risk flag or note
// @route   POST /api/progress/:id/updates
// @access  Private (participants who are not read-only)
exports.createUpdate = async (req, res, next) => {
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) return next(error);

        const isWorker = progress.canBeWorkedOnBy(actor);
        const isSupervisor = progress.canBeSupervisedBy(actor);
        if (!isWorker && !isSupervisor) {
            return next(
                new ErrorResponse(
                    'Only the student, the hiring company or the assigned mentor can post updates ' +
                    'on an open internship',
                    403
                )
            );
        }

        const type = req.body.type || 'checkin';

        // A risk flag is a supervisor's judgement; a student raises a blocker.
        if (type === 'risk_flag' && !isSupervisor) {
            return next(
                new ErrorResponse('Only a supervisor can raise a risk flag — post a blocker instead', 403)
            );
        }

        if (req.body.milestoneId) {
            const milestone = await loadMilestone(progress.id, req.body.milestoneId);
            if (!milestone) {
                return next(new ErrorResponse('That milestone does not belong to this internship', 400));
            }
        }

        const authorName = await actorDisplayName(actor);
        const update = await ProgressUpdate.create({
            progressId: progress.id,
            milestoneId: req.body.milestoneId || null,
            authorUserId: req.user.id,
            authorRole: actor.role,
            authorName,
            type,
            body: req.body.body,
            percentSelfReported:
                type === 'checkin' && req.body.percentSelfReported != null
                    ? req.body.percentSelfReported
                    : null,
            isSystemGenerated: false
        });

        await recalcAndAlert(progress.id, { touchActivity: true });

        if (type === 'blocker') {
            notifySupervisorsOfBlocker(progress.id, {
                milestoneTitle: null,
                body: req.body.body
            });
        } else {
            notifyOfProgressUpdate(progress.id, {
                authorRole: actor.role,
                authorName,
                type,
                body: req.body.body
            });
        }

        res.status(201).json({
            success: true,
            message: 'Update posted',
            data: (await ProgressUpdate.findByPk(update.id)).toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Edit your own update
// @route   PUT /api/progress/:id/updates/:updateId
// @access  Private (author)
exports.updateUpdate = async (req, res, next) => {
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) return next(error);

        const update = await ProgressUpdate.findOne({
            where: { id: req.params.updateId, progressId: progress.id }
        });
        if (!update) return next(new ErrorResponse('Update not found', 404));

        if (!update.canBeEditedBy(req.user.id) && actor.role !== 'admin') {
            return next(new ErrorResponse('You can only edit your own updates', 403));
        }

        if (req.body.body !== undefined) update.body = req.body.body;
        if (req.body.percentSelfReported !== undefined && update.type === 'checkin') {
            update.percentSelfReported = req.body.percentSelfReported;
        }
        await update.save();

        res.status(200).json({
            success: true,
            message: 'Update edited',
            data: update.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Close out a blocker or risk flag
// @route   PUT /api/progress/:id/updates/:updateId/resolve
// @access  Private (author | supervisors | admin)
exports.resolveUpdate = async (req, res, next) => {
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) return next(error);

        const update = await ProgressUpdate.findOne({
            where: { id: req.params.updateId, progressId: progress.id }
        });
        if (!update) return next(new ErrorResponse('Update not found', 404));

        if (!update.needsResolution()) {
            return next(
                new ErrorResponse('Only a blocker or a risk flag can be resolved', 400)
            );
        }
        if (update.resolvedAt) {
            return next(new ErrorResponse('That has already been resolved', 400));
        }
        if (!update.canBeResolvedBy(actor, req.user.id)) {
            return next(new ErrorResponse('You cannot resolve this', 403));
        }

        update.resolvedAt = new Date();
        update.resolvedByUserId = req.user.id;
        update.resolutionNote = req.body.resolutionNote || null;
        await update.save();

        // A milestone parked on a blocker goes back to in progress once the
        // blocker clears, so the plan does not sit stuck behind a closed issue.
        let milestoneTitle = null;
        if (update.milestoneId) {
            const milestone = await ProgressMilestone.findByPk(update.milestoneId);
            if (milestone) {
                milestoneTitle = milestone.title;
                if (milestone.status === 'blocked') {
                    const stillOpen = await ProgressUpdate.count({
                        where: {
                            milestoneId: milestone.id,
                            type: 'blocker',
                            resolvedAt: null
                        }
                    });
                    if (stillOpen === 0) {
                        milestone.status = 'in_progress';
                        milestone.blockedAt = null;
                        milestone.blockedReason = null;
                        await milestone.save();
                        await logTransition(progress.id, {
                            milestoneId: milestone.id,
                            milestoneTitle: milestone.title,
                            fromStatus: 'blocked',
                            toStatus: 'in_progress',
                            userId: req.user.id,
                            role: actor.role,
                            reason: 'Blocker resolved'
                        });
                    }
                }
            }
        }

        await recalcAndAlert(progress.id, { touchActivity: true });
        notifyOfBlockerResolved(progress.id, {
            milestoneTitle,
            resolutionNote: update.resolutionNote
        });

        res.status(200).json({
            success: true,
            message: 'Resolved',
            data: (await ProgressUpdate.findByPk(update.id)).toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete your own update
// @route   DELETE /api/progress/:id/updates/:updateId
// @access  Private (author | admin)
exports.deleteUpdate = async (req, res, next) => {
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user, {
            includeRelations: false
        });
        if (error) return next(error);

        const update = await ProgressUpdate.findOne({
            where: { id: req.params.updateId, progressId: progress.id }
        });
        if (!update) return next(new ErrorResponse('Update not found', 404));

        if (!update.canBeEditedBy(req.user.id) && actor.role !== 'admin') {
            return next(new ErrorResponse('You can only delete your own updates', 403));
        }

        await update.destroy();
        await recalcAndAlert(progress.id);

        res.status(200).json({ success: true, message: 'Update deleted' });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Progress report
// ---------------------------------------------------------------------------

// Deterministic stand-in for the AI insight, used when the service is down.
// Same response shape, so the frontend renders it identically and only the
// `aiGenerated` flag differs.
const fallbackInsight = (progress, milestones, indicators) => {
    const signals = [];
    let score = 0;
    const add = (code, severity, message, weight) => {
        signals.push({ code, severity, message, weight });
        score += weight;
    };

    const counted = milestones.filter((m) => m.countsTowardsTotal());
    if (counted.length === 0) {
        add('no_plan', 'warning', 'No milestones have been defined yet.', 15);
    }
    if (progress.status === 'not_started') {
        add('not_started', 'warning', 'No work has been recorded yet.', 15);
    }
    if (progress.overdueMilestoneCount > 0) {
        add(
            'overdue_milestones',
            'critical',
            `${progress.overdueMilestoneCount} milestone(s) are past their due date.`,
            25
        );
    }
    if (progress.openBlockerCount > 0) {
        add(
            'open_blockers',
            'critical',
            `${progress.openBlockerCount} unresolved blocker(s).`,
            20
        );
    }
    const elapsed = progress.scheduleElapsedRatio();
    if (elapsed != null) {
        const expectedPct = elapsed * 100;
        if (progress.progressPercent + 10 < expectedPct) {
            add(
                'schedule_lag',
                'warning',
                `${progress.progressPercent}% complete against ${Math.round(expectedPct)}% of the window used.`,
                30
            );
        }
    }
    if (progress.lastActivityAt) {
        const idleDays = (Date.now() - new Date(progress.lastActivityAt).getTime()) / DAY_MS;
        if (idleDays > 7 && progress.status === 'in_progress') {
            add('inactivity', 'warning', `No activity for ${Math.floor(idleDays)} days.`, 20);
        }
    }

    if (InternshipProgress.TERMINAL_STATUSES.includes(progress.status)) {
        return {
            progress_id: String(progress.id),
            risk_level: 'low',
            risk_score: 0,
            projected_completion_percent: progress.progressPercent,
            schedule_variance: 0,
            summary: `This internship is ${progress.status} at ${progress.progressPercent}%.`,
            signals: [],
            recommendations: [],
            indicators
        };
    }

    const capped = Math.min(100, score);
    const level = capped >= 55 ? 'high' : capped >= 25 ? 'medium' : 'low';
    const projected =
        elapsed && elapsed > 0.02
            ? Math.min(100, Math.round(progress.progressPercent / elapsed))
            : progress.progressPercent;

    return {
        progress_id: String(progress.id),
        risk_level: level,
        risk_score: capped,
        projected_completion_percent: projected,
        schedule_variance:
            elapsed != null
                ? Math.round((progress.progressPercent - elapsed * 100) * 100) / 100
                : 0,
        summary:
            level === 'low'
                ? `On track at ${progress.progressPercent}%.`
                : `Needs attention — ${signals.length} risk signal(s) at ${progress.progressPercent}% complete.`,
        signals: signals.sort((a, b) => b.weight - a.weight),
        recommendations: signals.length
            ? ['Review the open signals with the student at the next check-in.']
            : ['On track. Keep the current cadence.'],
        indicators
    };
};

// @desc    Full progress report: indicators, time series, AI risk assessment
// @route   GET /api/progress/:id/report
// @access  Private (participants)
exports.getProgressReport = async (req, res, next) => {
    try {
        const { progress, actor, error } = await loadProgressForActor(req.params.id, req.user);
        if (error) return next(error);

        await syncProgressMentor(progress);
        await recalcAndAlert(progress.id);

        const fresh = await InternshipProgress.findByPk(progress.id, {
            include: progressIncludes()
        });

        const [milestones, submissions, timeLogs, updates] = await Promise.all([
            ProgressMilestone.findAll({
                where: { progressId: fresh.id },
                order: [['orderIndex', 'ASC'], ['id', 'ASC']]
            }),
            MilestoneSubmission.findAll({ where: { progressId: fresh.id } }),
            ProgressTimeLog.findAll({
                where: { progressId: fresh.id },
                order: [['workDate', 'ASC']]
            }),
            ProgressUpdate.findAll({ where: { progressId: fresh.id } })
        ]);

        // --- derived performance indicators --------------------------------
        const reviewed = submissions.filter((s) =>
            ['approved', 'changes_requested'].includes(s.status)
        );
        const reworkRate = reviewed.length
            ? reviewed.filter((s) => s.status === 'changes_requested').length / reviewed.length
            : null;
        const onTimeRate = submissions.length
            ? submissions.filter((s) => !s.wasLate).length / submissions.length
            : null;
        const scores = submissions
            .map((s) => s.reviewScore)
            .filter((s) => s != null)
            .map(Number);
        const averageReviewScore = scores.length
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
            : null;

        const estimated = milestones.reduce(
            (sum, m) => sum + (m.estimatedHours != null ? Number(m.estimatedHours) : 0),
            0
        );
        const actual = Number(fresh.totalHoursLogged) || 0;

        const recentCheckins = updates.filter(
            (u) =>
                u.type === 'checkin' &&
                Date.now() - new Date(u.createdAt).getTime() < 14 * DAY_MS
        ).length;

        // Weekly effort series (ISO week start, Monday), oldest first.
        const weekly = new Map();
        timeLogs.forEach((l) => {
            const d = new Date(`${String(l.workDate)}T00:00:00Z`);
            const day = (d.getUTCDay() + 6) % 7; // Monday = 0
            const weekStart = new Date(d.getTime() - day * DAY_MS).toISOString().slice(0, 10);
            weekly.set(weekStart, (weekly.get(weekStart) || 0) + Number(l.hours));
        });
        const weeklyHours = Array.from(weekly.entries())
            .map(([weekStart, hours]) => ({ weekStart, hours: Math.round(hours * 100) / 100 }))
            .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));

        const statusBreakdown = ProgressMilestone.STATUSES.reduce((acc, s) => {
            acc[s] = milestones.filter((m) => m.status === s).length;
            return acc;
        }, {});

        const indicators = {
            completion_rate: fresh.milestoneCount
                ? Math.round((fresh.completedMilestoneCount / fresh.milestoneCount) * 10000) / 100
                : 0,
            weighted_completion: Number(fresh.progressPercent) || 0,
            hours_logged: actual,
            estimated_hours: Math.round(estimated * 100) / 100,
            effort_variance: estimated ? Math.round((actual - estimated) * 100) / 100 : 0,
            on_time_submission_rate: onTimeRate != null ? Math.round(onTimeRate * 10000) / 100 : 0,
            rework_rate: reworkRate != null ? Math.round(reworkRate * 10000) / 100 : 0,
            average_review_score: averageReviewScore || 0,
            open_blockers: Number(fresh.openBlockerCount) || 0,
            overdue_milestones: Number(fresh.overdueMilestoneCount) || 0
        };

        // --- AI risk assessment, with graceful degradation ------------------
        let insight;
        let aiGenerated = false;
        try {
            const dto = aiService.mapProgressToDto(fresh, milestones, {
                taskTitle: fresh.task ? fresh.task.title : '',
                recentCheckins,
                onTimeSubmissionRate: onTimeRate,
                reworkRate
            });
            insight = await aiService.analyzeProgress(dto);
            aiGenerated = true;
        } catch (err) {
            if (!(err instanceof aiService.AIServiceUnavailableError)) throw err;
            console.warn('[progress] AI unavailable, using fallback insight:', err.message);
            insight = fallbackInsight(fresh, milestones, indicators);
        }

        res.status(200).json({
            success: true,
            data: {
                progress: shapeForActor(fresh, actor),
                aiGenerated,
                insight,
                indicators,
                milestoneStatusBreakdown: statusBreakdown,
                milestones: milestones.map((m) => m.toJSON()),
                weeklyHours,
                submissionCount: submissions.length,
                pendingReviewCount: submissions.filter((s) => s.status === 'pending_review').length,
                openBlockers: updates.filter((u) => u.isOpen()).map((u) => u.toJSON()),
                recentCheckins
            }
        });
    } catch (error) {
        next(error);
    }
};
