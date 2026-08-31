const { Op } = require('sequelize');
const {
    sequelize,
    User,
    Student,
    Company,
    Task,
    TaskSkill,
    Application,
    Mentor,
    MentorExpertise,
    MentorAssignment,
    MentorAssignmentHistory,
    MentorNote,
    recalcMentorActiveCount,
    recalcMentorRating
} = require('../models');
const ErrorResponse = require('../utils/errorResponse');
const aiService = require('../services/aiService');
const {
    notifyMentorOfAssignmentRequest,
    notifyOfAssignmentAccepted,
    notifyCompanyOfDecline,
    notifyOfAssignmentCancelled,
    notifyOfNewNote
} = require('../utils/mentorNotifications');

const STUDENT_BASIC_ATTRS = [
    'id', 'firstName', 'lastName', 'headline', 'profilePicture',
    'locationCity', 'locationCountry', 'profileCompletion'
];
const COMPANY_MIN_ATTRS = ['id', 'companyName', 'logo', 'industry', 'contactEmail'];
const MENTOR_CARD_ATTRS = [
    'id', 'firstName', 'lastName', 'headline', 'profilePicture',
    'currentPosition', 'currentCompany', 'yearsOfExperience',
    'availabilityStatus', 'maxActiveMentees', 'activeMenteeCount',
    'verificationStatus', 'statAverageRating', 'statTotalRatings',
    'locationCity', 'locationCountry'
];

const resolveStudent = (userId) => Student.findOne({ where: { userId } });
const resolveCompany = (userId) => Company.findOne({ where: { userId } });
const resolveMentor = (userId) => Mentor.findOne({ where: { userId } });

// Builds the { role, mentorId?, studentId?, companyId? } shape the model
// predicates (belongsToActor, canBeRespondedBy, ...) expect.
const resolveActor = async (user) => {
    const actor = { role: user.role, userId: user.id };
    if (user.role === 'mentor') {
        const mentor = await resolveMentor(user.id);
        if (mentor) actor.mentorId = mentor.id;
    } else if (user.role === 'student') {
        const student = await resolveStudent(user.id);
        if (student) actor.studentId = student.id;
    } else if (user.role === 'company') {
        const company = await resolveCompany(user.id);
        if (company) actor.companyId = company.id;
    }
    return actor;
};

const assignmentIncludes = () => ([
    {
        model: Mentor,
        as: 'mentor',
        attributes: MENTOR_CARD_ATTRS,
        include: [{ model: MentorExpertise, as: 'expertise' }]
    },
    { model: Student, as: 'student', attributes: STUDENT_BASIC_ATTRS },
    { model: Company, as: 'company', attributes: COMPANY_MIN_ATTRS },
    { model: Task, as: 'task', attributes: ['id', 'title', 'category', 'experienceLevel', 'status'] },
    { model: Application, as: 'application', attributes: ['id', 'status'] }
]);

// Writes the audit row for every lifecycle transition.
const logTransition = (assignment, fromStatus, toStatus, userId, reason, transaction) =>
    MentorAssignmentHistory.create(
        {
            assignmentId: assignment.id,
            fromStatus,
            toStatus,
            changedByUserId: userId || null,
            reason: reason || null
        },
        { transaction }
    );

const paginate = (query) => {
    const page = parseInt(query.page || 1, 10);
    const limit = parseInt(query.limit || 10, 10);
    return { page, limit, offset: (page - 1) * limit };
};

const paginationPayload = (page, limit, count) => {
    const totalPages = Math.ceil(count / limit);
    return {
        currentPage: page,
        totalPages,
        totalAssignments: count,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
    };
};

// Maps ?scope= to a status filter shared by the mentor/student/company lists.
const scopeToStatus = (scope) => {
    if (!scope || scope === 'all') return null;
    if (scope === 'pending') return ['pending'];
    if (scope === 'active') return ['active'];
    if (scope === 'completed') return ['completed'];
    if (scope === 'closed') return ['completed', 'declined', 'cancelled'];
    return null;
};

// ---------------------------------------------------------------------------
// Company: suggestions + assignment
// ---------------------------------------------------------------------------

// @desc    Ranked mentor suggestions for an accepted application
// @route   GET /api/mentor-assignments/applications/:applicationId/suggestions
// @access  Private (company)
exports.getMentorSuggestions = async (req, res, next) => {
    try {
        const company = await resolveCompany(req.user.id);
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const application = await Application.findByPk(req.params.applicationId, {
            include: [
                {
                    model: Task,
                    as: 'task',
                    include: [{ model: TaskSkill, as: 'skillsRequired' }]
                }
            ]
        });
        if (!application) return next(new ErrorResponse('Application not found', 404));
        if (!application.task || String(application.task.companyId) !== String(company.id)) {
            return next(new ErrorResponse('Not authorized for this application', 403));
        }

        // Only verified, available mentors are ever suggested.
        const mentors = await Mentor.findAll({
            where: {
                verificationStatus: 'approved',
                availabilityStatus: { [Op.ne]: 'unavailable' }
            },
            attributes: MENTOR_CARD_ATTRS.concat(['bio']),
            include: [{ model: MentorExpertise, as: 'expertise' }]
        });

        // Drop mentors already at capacity (counted, not read from the cache).
        const activeCounts = await MentorAssignment.findAll({
            where: { status: 'active' },
            attributes: ['mentorId', [sequelize.fn('COUNT', sequelize.col('id')), 'n']],
            group: ['mentorId'],
            raw: true
        });
        const activeByMentor = activeCounts.reduce((acc, r) => {
            acc[String(r.mentorId)] = Number(r.n);
            return acc;
        }, {});

        const available = mentors.filter(
            (m) => (activeByMentor[String(m.id)] || 0) < m.maxActiveMentees
        );

        // Exclude anyone already holding a live assignment on this application.
        const taken = await MentorAssignment.findAll({
            where: {
                applicationId: application.id,
                status: { [Op.in]: MentorAssignment.OCCUPYING_STATUSES }
            },
            attributes: ['mentorId']
        });
        const takenIds = new Set(taken.map((t) => String(t.mentorId)));
        const candidates = available.filter((m) => !takenIds.has(String(m.id)));

        let ranked = [];
        let aiUsed = false;

        if (candidates.length > 0) {
            try {
                const taskDto = aiService.mapTaskToDto(application.task);
                const mentorDtos = candidates.map((m) => {
                    const dto = aiService.mapMentorToDto(m);
                    dto.active_mentees = activeByMentor[String(m.id)] || 0;
                    return dto;
                });
                const ranking = await aiService.rankMentors(taskDto, mentorDtos);
                const byId = new Map(ranking.map((r) => [String(r.mentor_id), r]));
                ranked = candidates
                    .map((m) => {
                        const r = byId.get(String(m.id));
                        return {
                            ...m.toJSON(),
                            activeMenteeCount: activeByMentor[String(m.id)] || 0,
                            matchScore: r ? r.score : null,
                            matchReasons: r ? r.reasons : [],
                            matchedSkills: r ? r.matched_skills : [],
                            missingSkills: r ? r.missing_skills : []
                        };
                    })
                    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
                aiUsed = true;
            } catch (err) {
                if (!(err instanceof aiService.AIServiceUnavailableError)) throw err;

                // Graceful degradation: order by expertise overlap with the task's
                // required skills, then by seniority. Same contract, no AI.
                console.warn('[mentorAssignments] AI unavailable, using fallback ranking:', err.message);
                const required = (application.task.skillsRequired || []).map((s) =>
                    String(s.name || '').trim().toLowerCase()
                );
                ranked = candidates
                    .map((m) => {
                        const names = (m.expertise || []).map((e) =>
                            String(e.name || '').trim().toLowerCase()
                        );
                        const overlap = required.filter((r) => names.includes(r));
                        return {
                            ...m.toJSON(),
                            activeMenteeCount: activeByMentor[String(m.id)] || 0,
                            matchScore: null,
                            matchReasons: overlap.length
                                ? ['Matches ' + overlap.length + '/' + required.length + ' required skills']
                                : ['No overlap with the required skills'],
                            matchedSkills: overlap,
                            missingSkills: required.filter((r) => !names.includes(r)),
                            _overlap: overlap.length
                        };
                    })
                    .sort((a, b) =>
                        b._overlap - a._overlap ||
                        (b.yearsOfExperience || 0) - (a.yearsOfExperience || 0)
                    )
                    .map(({ _overlap, ...rest }) => rest);
            }
        }

        res.status(200).json({
            success: true,
            data: {
                applicationId: String(application.id),
                taskTitle: application.task.title,
                aiRanked: aiUsed,
                mentors: ranked
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Assign a mentor to an accepted application
// @route   POST /api/mentor-assignments/applications/:applicationId
// @access  Private (company)
exports.assignMentor = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const company = await resolveCompany(req.user.id);
        if (!company) { await t.rollback(); return next(new ErrorResponse('Company profile not found', 404)); }

        const application = await Application.findByPk(req.params.applicationId, {
            include: [{ model: Task, as: 'task' }]
        });
        if (!application) { await t.rollback(); return next(new ErrorResponse('Application not found', 404)); }
        if (!application.task || String(application.task.companyId) !== String(company.id)) {
            await t.rollback();
            return next(new ErrorResponse('Not authorized for this application', 403));
        }

        // A mentor only makes sense once the student is actually on the internship.
        if (application.status !== 'accepted') {
            await t.rollback();
            return next(
                new ErrorResponse('A mentor can only be assigned to an accepted application', 400)
            );
        }

        const existing = await MentorAssignment.findOne({
            where: {
                applicationId: application.id,
                status: { [Op.in]: MentorAssignment.OCCUPYING_STATUSES }
            }
        });
        if (existing) {
            await t.rollback();
            return next(
                new ErrorResponse(
                    'This internship already has a ' + existing.status + ' mentor assignment',
                    400
                )
            );
        }

        const mentor = await Mentor.findByPk(req.body.mentorId);
        if (!mentor) { await t.rollback(); return next(new ErrorResponse('Mentor not found', 404)); }

        if (!mentor.isVerified()) {
            await t.rollback();
            return next(new ErrorResponse('That mentor has not been verified by an administrator', 403));
        }
        if (mentor.availabilityStatus === 'unavailable') {
            await t.rollback();
            return next(new ErrorResponse('That mentor is currently unavailable', 400));
        }

        // Capacity is COUNTed, never read from the cached column.
        const activeCount = await MentorAssignment.count({
            where: { mentorId: mentor.id, status: 'active' },
            transaction: t
        });
        if (activeCount >= mentor.maxActiveMentees) {
            await t.rollback();
            return next(new ErrorResponse('That mentor is already at full capacity', 400));
        }

        const assignment = await MentorAssignment.create(
            {
                applicationId: application.id,
                mentorId: mentor.id,
                studentId: application.studentId,
                taskId: application.taskId,
                companyId: company.id,
                status: 'pending',
                matchScore:
                    req.body.matchScore === undefined || req.body.matchScore === null
                        ? null
                        : req.body.matchScore,
                assignedByUserId: req.user.id,
                assignmentNote: req.body.assignmentNote || null
            },
            { transaction: t }
        );

        await logTransition(assignment, null, 'pending', req.user.id, null, t);
        await t.commit();

        notifyMentorOfAssignmentRequest(assignment.id);

        const fresh = await MentorAssignment.findByPk(assignment.id, {
            include: assignmentIncludes()
        });

        res.status(201).json({
            success: true,
            message: 'Mentor assigned. Waiting for them to accept.',
            data: fresh.toJSON()
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// @desc    Cancel a pending or active assignment
// @route   PUT /api/mentor-assignments/:id/cancel
// @access  Private (company, admin)
exports.cancelAssignment = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const actor = await resolveActor(req.user);
        const assignment = await MentorAssignment.findByPk(req.params.id);
        if (!assignment) { await t.rollback(); return next(new ErrorResponse('Assignment not found', 404)); }

        if (!assignment.canBeCancelledBy(actor)) {
            await t.rollback();
            return next(new ErrorResponse('You cannot cancel this assignment', 403));
        }

        const fromStatus = assignment.status;
        assignment.status = 'cancelled';
        assignment.cancelledAt = new Date();
        assignment.cancellationReason = req.body.reason || null;
        await assignment.save({ transaction: t });

        await logTransition(assignment, fromStatus, 'cancelled', req.user.id, req.body.reason, t);
        await recalcMentorActiveCount(assignment.mentorId, { transaction: t });
        await t.commit();

        notifyOfAssignmentCancelled(assignment.id, req.body.reason || null);

        const fresh = await MentorAssignment.findByPk(assignment.id, { include: assignmentIncludes() });

        res.status(200).json({
            success: true,
            message: 'Mentorship cancelled',
            data: fresh.toJSON()
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// @desc    All mentorships across the company's tasks
// @route   GET /api/mentor-assignments/company
// @access  Private (company)
exports.getCompanyAssignments = async (req, res, next) => {
    try {
        const company = await resolveCompany(req.user.id);
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const { page, limit, offset } = paginate(req.query);
        const where = { companyId: company.id };
        const statuses = scopeToStatus(req.query.scope);
        if (statuses) where.status = { [Op.in]: statuses };
        if (req.query.taskId) where.taskId = req.query.taskId;

        const { rows, count } = await MentorAssignment.findAndCountAll({
            where,
            include: assignmentIncludes(),
            order: [['createdAt', 'DESC']],
            offset,
            limit,
            distinct: true
        });

        res.status(200).json({
            success: true,
            data: {
                assignments: rows.map((r) => r.toJSON()),
                pagination: paginationPayload(page, limit, count)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Accepted applications on this company's tasks that have no live mentor
// @route   GET /api/mentor-assignments/company/unassigned
// @access  Private (company)
exports.getUnassignedInternships = async (req, res, next) => {
    try {
        const company = await resolveCompany(req.user.id);
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const accepted = await Application.findAll({
            where: { status: 'accepted' },
            include: [
                {
                    model: Task,
                    as: 'task',
                    where: { companyId: company.id },
                    attributes: ['id', 'title', 'category', 'experienceLevel']
                },
                { model: Student, as: 'student', attributes: STUDENT_BASIC_ATTRS }
            ],
            order: [['decidedAt', 'DESC']]
        });

        const live = await MentorAssignment.findAll({
            where: {
                companyId: company.id,
                status: { [Op.in]: MentorAssignment.OCCUPYING_STATUSES }
            },
            attributes: ['applicationId']
        });
        const liveIds = new Set(live.map((a) => String(a.applicationId)));

        const unassigned = accepted
            .filter((a) => !liveIds.has(String(a.id)))
            .map((a) => ({
                applicationId: String(a.id),
                _id: String(a.id),
                decidedAt: a.decidedAt,
                task: a.task ? a.task.toJSON() : null,
                student: a.student ? a.student.toJSON() : null
            }));

        res.status(200).json({
            success: true,
            data: { applications: unassigned, count: unassigned.length }
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Mentor
// ---------------------------------------------------------------------------

// @desc    The logged-in mentor's assignments
// @route   GET /api/mentor-assignments/me
// @access  Private (mentor)
exports.getMyAssignments = async (req, res, next) => {
    try {
        const mentor = await resolveMentor(req.user.id);
        if (!mentor) return next(new ErrorResponse('Mentor profile not found', 404));

        const { page, limit, offset } = paginate(req.query);
        const where = { mentorId: mentor.id };
        const statuses = scopeToStatus(req.query.scope);
        if (statuses) where.status = { [Op.in]: statuses };

        const { rows, count } = await MentorAssignment.findAndCountAll({
            where,
            include: assignmentIncludes(),
            // Pending requests first, then the most recently touched.
            order: [
                [sequelize.literal("CASE WHEN `MentorAssignment`.`status` = 'pending' THEN 0 ELSE 1 END"), 'ASC'],
                ['createdAt', 'DESC']
            ],
            offset,
            limit,
            distinct: true
        });

        res.status(200).json({
            success: true,
            data: {
                assignments: rows.map((r) => r.toJSON()),
                pagination: paginationPayload(page, limit, count)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Accept or decline a pending assignment
// @route   PUT /api/mentor-assignments/:id/respond
// @access  Private (mentor)
exports.respondToAssignment = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const actor = await resolveActor(req.user);
        if (!actor.mentorId) { await t.rollback(); return next(new ErrorResponse('Mentor profile not found', 404)); }

        const assignment = await MentorAssignment.findByPk(req.params.id);
        if (!assignment) { await t.rollback(); return next(new ErrorResponse('Assignment not found', 404)); }

        if (!assignment.canBeRespondedBy(actor)) {
            await t.rollback();
            return next(
                new ErrorResponse('This request is no longer awaiting your response', 403)
            );
        }

        const { action, reason } = req.body;
        const fromStatus = assignment.status;

        if (action === 'accept') {
            const mentor = await Mentor.findByPk(actor.mentorId, { transaction: t });

            // Re-check capacity at accept time — the mentor may have accepted
            // other requests since this one was created.
            const activeCount = await MentorAssignment.count({
                where: { mentorId: actor.mentorId, status: 'active' },
                transaction: t
            });
            if (activeCount >= mentor.maxActiveMentees) {
                await t.rollback();
                return next(
                    new ErrorResponse(
                        'You are at full capacity. Complete or decline an existing mentorship first.',
                        400
                    )
                );
            }

            assignment.status = 'active';
            assignment.respondedAt = new Date();
            assignment.startedAt = new Date();
        } else {
            assignment.status = 'declined';
            assignment.respondedAt = new Date();
            assignment.declineReason = reason || null;
        }

        await assignment.save({ transaction: t });
        await logTransition(assignment, fromStatus, assignment.status, req.user.id, reason, t);
        await recalcMentorActiveCount(actor.mentorId, { transaction: t });
        await t.commit();

        if (action === 'accept') {
            notifyOfAssignmentAccepted(assignment.id);
        } else {
            notifyCompanyOfDecline(assignment.id, reason || null);
        }

        const fresh = await MentorAssignment.findByPk(assignment.id, { include: assignmentIncludes() });

        res.status(200).json({
            success: true,
            message: action === 'accept' ? 'Mentorship accepted' : 'Mentorship declined',
            data: fresh.toJSON()
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// @desc    Mark an active mentorship complete
// @route   PUT /api/mentor-assignments/:id/complete
// @access  Private (mentor, admin)
exports.completeAssignment = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const actor = await resolveActor(req.user);
        const assignment = await MentorAssignment.findByPk(req.params.id);
        if (!assignment) { await t.rollback(); return next(new ErrorResponse('Assignment not found', 404)); }

        if (!assignment.canBeCompletedBy(actor)) {
            await t.rollback();
            return next(new ErrorResponse('You cannot complete this mentorship', 403));
        }

        const fromStatus = assignment.status;
        assignment.status = 'completed';
        assignment.completedAt = new Date();
        if (req.body.mentorFeedback !== undefined) assignment.mentorFeedback = req.body.mentorFeedback;
        if (req.body.mentorRating !== undefined) assignment.mentorRating = req.body.mentorRating;
        await assignment.save({ transaction: t });

        await logTransition(assignment, fromStatus, 'completed', req.user.id, null, t);
        await recalcMentorActiveCount(assignment.mentorId, { transaction: t });
        await recalcMentorRating(assignment.mentorId, { transaction: t });
        await t.commit();

        const fresh = await MentorAssignment.findByPk(assignment.id, { include: assignmentIncludes() });

        res.status(200).json({
            success: true,
            message: 'Mentorship marked complete',
            data: fresh.toJSON()
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Student
// ---------------------------------------------------------------------------

// @desc    The logged-in student's mentorships
// @route   GET /api/mentor-assignments/student
// @access  Private (student)
exports.getStudentAssignments = async (req, res, next) => {
    try {
        const student = await resolveStudent(req.user.id);
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const { page, limit, offset } = paginate(req.query);
        // A pending request is between the company and the mentor — the student
        // only sees a mentorship once it is live.
        const where = {
            studentId: student.id,
            status: { [Op.in]: ['active', 'completed'] }
        };
        const statuses = scopeToStatus(req.query.scope);
        if (statuses) where.status = { [Op.in]: statuses.filter((s) => s !== 'pending') };

        const { rows, count } = await MentorAssignment.findAndCountAll({
            where,
            include: assignmentIncludes(),
            order: [['createdAt', 'DESC']],
            offset,
            limit,
            distinct: true
        });

        res.status(200).json({
            success: true,
            data: {
                assignments: rows.map((r) => r.toJSON()),
                pagination: paginationPayload(page, limit, count)
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Student rates their mentor after completion
// @route   PUT /api/mentor-assignments/:id/rate
// @access  Private (student)
exports.rateMentor = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const actor = await resolveActor(req.user);
        const assignment = await MentorAssignment.findByPk(req.params.id);
        if (!assignment) { await t.rollback(); return next(new ErrorResponse('Assignment not found', 404)); }

        if (!assignment.canBeRatedByStudent(actor)) {
            await t.rollback();
            return next(
                new ErrorResponse(
                    'You can only rate a completed mentorship, and only once',
                    403
                )
            );
        }

        assignment.studentRating = req.body.studentRating;
        assignment.studentFeedback = req.body.studentFeedback || null;
        await assignment.save({ transaction: t });

        await recalcMentorRating(assignment.mentorId, { transaction: t });
        await t.commit();

        const fresh = await MentorAssignment.findByPk(assignment.id, { include: assignmentIncludes() });

        res.status(200).json({
            success: true,
            message: 'Thanks for rating your mentor',
            data: fresh.toJSON()
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// @desc    Every assignment (current + history) for one application, newest first
// @route   GET /api/mentor-assignments/applications/:applicationId
// @access  Private (owning company | the student on it | admin)
exports.getAssignmentsForApplication = async (req, res, next) => {
    try {
        const actor = await resolveActor(req.user);

        const application = await Application.findByPk(req.params.applicationId, {
            include: [{ model: Task, as: 'task' }]
        });
        if (!application) return next(new ErrorResponse('Application not found', 404));

        const isOwningCompany =
            actor.role === 'company' &&
            actor.companyId != null &&
            application.task &&
            String(application.task.companyId) === String(actor.companyId);
        const isOwningStudent =
            actor.role === 'student' &&
            actor.studentId != null &&
            String(application.studentId) === String(actor.studentId);

        if (!isOwningCompany && !isOwningStudent && actor.role !== 'admin') {
            return next(new ErrorResponse('Not authorized for this application', 403));
        }

        const assignments = await MentorAssignment.findAll({
            where: { applicationId: application.id },
            include: assignmentIncludes(),
            order: [['createdAt', 'DESC']]
        });

        const json = assignments.map((a) => {
            const v = a.toJSON();
            if (actor.role === 'student') delete v.assignmentNote;
            return v;
        });

        res.status(200).json({ success: true, data: { assignments: json } });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

// @desc    A single assignment
// @route   GET /api/mentor-assignments/:id
// @access  Private (mentor | student | owning company | admin)
exports.getAssignment = async (req, res, next) => {
    try {
        const actor = await resolveActor(req.user);
        const assignment = await MentorAssignment.findByPk(req.params.id, {
            include: assignmentIncludes().concat([
                {
                    model: MentorAssignmentHistory,
                    as: 'statusHistory',
                    separate: true,
                    order: [['createdAt', 'ASC']]
                }
            ])
        });
        if (!assignment) return next(new ErrorResponse('Assignment not found', 404));

        if (!assignment.canBeViewedBy(actor)) {
            return next(new ErrorResponse('Not authorized to view this mentorship', 403));
        }

        // A student never sees the company's private note to the mentor.
        const json = assignment.toJSON();
        if (actor.role === 'student') delete json.assignmentNote;

        res.status(200).json({ success: true, data: json });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Guidance notes
// ---------------------------------------------------------------------------

const loadAssignmentForNotes = async (assignmentId, user) => {
    const actor = await resolveActor(user);
    const assignment = await MentorAssignment.findByPk(assignmentId);
    return { actor, assignment };
};

// @desc    List the guidance-note thread
// @route   GET /api/mentor-assignments/:id/notes
// @access  Private (mentor | student on that assignment)
exports.getNotes = async (req, res, next) => {
    try {
        const { actor, assignment } = await loadAssignmentForNotes(req.params.id, req.user);
        if (!assignment) return next(new ErrorResponse('Assignment not found', 404));

        // Admins may read a thread for moderation, participants for the real work.
        if (!assignment.canExchangeNotes(actor) && actor.role !== 'admin') {
            return next(new ErrorResponse('Not authorized to view these notes', 403));
        }

        const notes = await MentorNote.findAll({
            where: { assignmentId: assignment.id },
            include: [{ model: User, as: 'author', attributes: ['id', 'avatar'] }],
            order: [['isPinned', 'DESC'], ['createdAt', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: { notes: notes.map((n) => n.toJSON()), count: notes.length }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Post a guidance note
// @route   POST /api/mentor-assignments/:id/notes
// @access  Private (mentor | student on that assignment)
exports.addNote = async (req, res, next) => {
    try {
        const { actor, assignment } = await loadAssignmentForNotes(req.params.id, req.user);
        if (!assignment) return next(new ErrorResponse('Assignment not found', 404));

        if (!assignment.canExchangeNotes(actor)) {
            return next(
                new ErrorResponse(
                    'Notes are only available to the mentor and student on an active mentorship',
                    403
                )
            );
        }

        // Snapshot the author's name so the thread still reads correctly if the
        // account is later removed (authorUserId is ON DELETE SET NULL).
        let authorName = null;
        if (actor.role === 'mentor') {
            const mentor = await Mentor.findByPk(actor.mentorId, { attributes: ['firstName', 'lastName'] });
            if (mentor) authorName = [mentor.firstName, mentor.lastName].filter(Boolean).join(' ');
        } else {
            const student = await Student.findByPk(actor.studentId, { attributes: ['firstName', 'lastName'] });
            if (student) authorName = [student.firstName, student.lastName].filter(Boolean).join(' ');
        }

        const note = await MentorNote.create({
            assignmentId: assignment.id,
            authorUserId: req.user.id,
            authorRole: actor.role,
            authorName,
            body: req.body.body,
            isPinned: false
        });

        assignment.lastNoteAt = new Date();
        await assignment.save();

        notifyOfNewNote(assignment.id, note.id);

        res.status(201).json({
            success: true,
            message: 'Note posted',
            data: note.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Edit a note, or pin/unpin it
// @route   PUT /api/mentor-assignments/:id/notes/:noteId
// @access  Private (author; mentor may pin any note on their assignment)
exports.updateNote = async (req, res, next) => {
    try {
        const { actor, assignment } = await loadAssignmentForNotes(req.params.id, req.user);
        if (!assignment) return next(new ErrorResponse('Assignment not found', 404));
        if (!assignment.canExchangeNotes(actor)) {
            return next(new ErrorResponse('Not authorized for this thread', 403));
        }

        const note = await MentorNote.findOne({
            where: { id: req.params.noteId, assignmentId: assignment.id }
        });
        if (!note) return next(new ErrorResponse('Note not found', 404));

        // Only the author edits the text; the mentor curates what stays pinned.
        if (req.body.body !== undefined) {
            if (!note.canBeEditedBy(req.user.id)) {
                return next(new ErrorResponse('You can only edit your own notes', 403));
            }
            note.body = req.body.body;
        }
        if (req.body.isPinned !== undefined) {
            if (actor.role !== 'mentor') {
                return next(new ErrorResponse('Only the mentor can pin notes', 403));
            }
            note.isPinned = !!req.body.isPinned;
        }

        await note.save();

        res.status(200).json({ success: true, message: 'Note updated', data: note.toJSON() });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete your own note
// @route   DELETE /api/mentor-assignments/:id/notes/:noteId
// @access  Private (author)
exports.deleteNote = async (req, res, next) => {
    try {
        const { actor, assignment } = await loadAssignmentForNotes(req.params.id, req.user);
        if (!assignment) return next(new ErrorResponse('Assignment not found', 404));
        if (!assignment.canExchangeNotes(actor)) {
            return next(new ErrorResponse('Not authorized for this thread', 403));
        }

        const note = await MentorNote.findOne({
            where: { id: req.params.noteId, assignmentId: assignment.id }
        });
        if (!note) return next(new ErrorResponse('Note not found', 404));
        if (!note.canBeEditedBy(req.user.id)) {
            return next(new ErrorResponse('You can only delete your own notes', 403));
        }

        await note.destroy();

        res.status(200).json({ success: true, message: 'Note deleted' });
    } catch (error) {
        next(error);
    }
};
