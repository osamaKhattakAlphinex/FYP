const { Op, fn, col } = require('sequelize');
const {
    sequelize,
    Interview,
    Application,
    ApplicationStatusHistory,
    Task,
    Company,
    Student,
    User
} = require('../models');
const ErrorResponse = require('../utils/errorResponse');
const sendEmail = require('../utils/sendEmail');
const {
    interviewScheduled,
    interviewRescheduled,
    interviewCancelled
} = require('../utils/emailTemplates');

const STUDENT_BASIC_ATTRS = [
    'id', 'firstName', 'lastName', 'headline', 'profilePicture',
    'locationCity', 'locationCountry'
];
const COMPANY_MIN_ATTRS = [
    'id', 'companyName', 'logo', 'industry', 'contactEmail'
];

const SCHEDULABLE_FROM = ['submitted', 'under_review', 'shortlisted', 'interview_scheduled'];

const resolveStudent = async (userId) => Student.findOne({ where: { userId } });
const resolveCompany = async (userId) => Company.findOne({ where: { userId } });

// Build the actor context that Interview instance methods expect.
const buildActor = async (user) => {
    const actor = { role: user.role, userId: user.id };
    if (user.role === 'student') {
        const s = await resolveStudent(user.id);
        actor.studentId = s ? s.id : null;
    } else if (user.role === 'company') {
        const c = await resolveCompany(user.id);
        actor.companyId = c ? c.id : null;
    }
    return actor;
};

// Translate Mongo-style interview body into flat columns
const flattenInterviewBody = (body = {}) => {
    const out = {};
    ['scheduledAt', 'durationMinutes', 'mode', 'agenda', 'timezone'].forEach((k) => {
        if (body[k] !== undefined) out[k] = body[k];
    });
    if (body.meeting && typeof body.meeting === 'object') {
        if (body.meeting.link !== undefined) out.meetingLink = body.meeting.link;
        if (body.meeting.location !== undefined) out.meetingLocation = body.meeting.location;
        if (body.meeting.phoneNumber !== undefined) out.meetingPhoneNumber = body.meeting.phoneNumber;
    }
    // Also accept flat versions
    ['meetingLink', 'meetingLocation', 'meetingPhoneNumber'].forEach((k) => {
        if (body[k] !== undefined) out[k] = body[k];
    });
    return out;
};

const interviewIncludes = () => ([
    { model: Task, as: 'task' },
    { model: Company, as: 'company', attributes: COMPANY_MIN_ATTRS },
    {
        model: Student,
        as: 'student',
        attributes: STUDENT_BASIC_ATTRS,
        include: [{ model: User, as: 'user', attributes: ['id', 'email'] }]
    },
    { model: Application, as: 'application', attributes: ['id', 'status'] }
]);

// Best-effort email — never throws, never blocks the response.
const safeSendEmail = async (email, payload) => {
    try {
        if (!email || !payload) return;
        await sendEmail({ email, subject: payload.subject, html: payload.html });
    } catch (err) {
        console.warn('[interviewNotifications] email failed:', err.message);
    }
};

// =========================
// COMPANY: schedule
// =========================
exports.scheduleInterview = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const company = await resolveCompany(req.user.id);
        if (!company) {
            await t.rollback();
            return next(new ErrorResponse('Company profile not found', 404));
        }

        const application = await Application.findByPk(req.params.applicationId, {
            include: [
                { model: Task, as: 'task' },
                {
                    model: Student,
                    as: 'student',
                    attributes: STUDENT_BASIC_ATTRS,
                    include: [{ model: User, as: 'user', attributes: ['email'] }]
                }
            ]
        });

        if (!application) {
            await t.rollback();
            return next(new ErrorResponse('Application not found', 404));
        }
        if (!application.task || String(application.task.companyId) !== String(company.id)) {
            await t.rollback();
            return next(new ErrorResponse('Not authorized to schedule for this application', 403));
        }
        if (!SCHEDULABLE_FROM.includes(application.status)) {
            await t.rollback();
            return next(new ErrorResponse(
                `Cannot schedule an interview while the application is '${application.status}'`,
                400
            ));
        }

        const data = flattenInterviewBody(req.body);
        if (!data.scheduledAt) {
            await t.rollback();
            return next(new ErrorResponse('scheduledAt is required', 400));
        }
        if (new Date(data.scheduledAt).getTime() <= Date.now()) {
            await t.rollback();
            return next(new ErrorResponse('scheduledAt must be in the future', 400));
        }
        if (!data.mode || !Interview.MODES.includes(data.mode)) {
            await t.rollback();
            return next(new ErrorResponse(`mode must be one of: ${Interview.MODES.join(', ')}`, 400));
        }

        const interview = await Interview.create(
            {
                applicationId: application.id,
                taskId: application.taskId,
                studentId: application.studentId,
                companyId: company.id,
                scheduledAt: data.scheduledAt,
                durationMinutes: data.durationMinutes || 30,
                mode: data.mode,
                meetingLink: data.meetingLink || null,
                meetingLocation: data.meetingLocation || null,
                meetingPhoneNumber: data.meetingPhoneNumber || null,
                agenda: data.agenda || null,
                timezone: data.timezone || 'UTC',
                status: 'scheduled',
                createdByUserId: req.user.id
            },
            { transaction: t }
        );

        if (application.status !== 'interview_scheduled') {
            const fromStatus = application.status;
            application.status = 'interview_scheduled';
            await application.save({ transaction: t });
            await ApplicationStatusHistory.create(
                {
                    applicationId: application.id,
                    fromStatus,
                    toStatus: 'interview_scheduled',
                    changedByUserId: req.user.id,
                    reason: 'Interview scheduled'
                },
                { transaction: t }
            );
        }

        await t.commit();

        // Fire-and-forget confirmation email to the student
        const studentName = [application.student?.firstName, application.student?.lastName]
            .filter(Boolean)
            .join(' ');
        safeSendEmail(
            application.student?.user?.email,
            interviewScheduled({
                studentName,
                companyName: company.companyName,
                taskTitle: application.task?.title || 'a task',
                scheduledAt: interview.scheduledAt,
                timezone: interview.timezone,
                mode: interview.mode,
                meetingLink: interview.meetingLink,
                meetingLocation: interview.meetingLocation,
                meetingPhoneNumber: interview.meetingPhoneNumber,
                agenda: interview.agenda
            })
        );

        const fresh = await Interview.findByPk(interview.id, { include: interviewIncludes() });
        res.status(201).json({
            success: true,
            message: 'Interview scheduled successfully',
            data: fresh.toJSON()
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// =========================
// reschedule (either side)
// =========================
exports.rescheduleInterview = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { scheduledAt, reason } = req.body;
        if (!scheduledAt) {
            await t.rollback();
            return next(new ErrorResponse('scheduledAt is required', 400));
        }
        if (new Date(scheduledAt).getTime() <= Date.now()) {
            await t.rollback();
            return next(new ErrorResponse('scheduledAt must be in the future', 400));
        }

        const interview = await Interview.findByPk(req.params.id, { include: interviewIncludes() });
        if (!interview) {
            await t.rollback();
            return next(new ErrorResponse('Interview not found', 404));
        }

        const actor = await buildActor(req.user);
        if (!interview.canBeRescheduledBy(actor)) {
            await t.rollback();
            return next(new ErrorResponse(
                'You cannot reschedule this interview (not allowed, past, or reschedule limit reached)',
                403
            ));
        }

        interview.scheduledAt = scheduledAt;
        interview.status = 'rescheduled';
        interview.rescheduleCount += 1;
        await interview.save({ transaction: t });

        await t.commit();

        // Email the OTHER party
        const isCompanyActor = actor.role === 'company';
        const recipientEmail = isCompanyActor
            ? interview.student?.user?.email
            : interview.company?.contactEmail;
        const recipientName = isCompanyActor
            ? [interview.student?.firstName, interview.student?.lastName].filter(Boolean).join(' ')
            : interview.company?.companyName;

        safeSendEmail(
            recipientEmail,
            interviewRescheduled({
                recipientName,
                companyName: interview.company?.companyName,
                taskTitle: interview.task?.title || 'a task',
                scheduledAt: interview.scheduledAt,
                timezone: interview.timezone,
                mode: interview.mode,
                meetingLink: interview.meetingLink,
                meetingLocation: interview.meetingLocation,
                meetingPhoneNumber: interview.meetingPhoneNumber,
                reason: reason || null
            })
        );

        const fresh = await Interview.findByPk(interview.id, { include: interviewIncludes() });
        res.status(200).json({
            success: true,
            message: 'Interview rescheduled',
            data: fresh.toJSON()
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// =========================
// cancel (either side)
// =========================
exports.cancelInterview = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { reason } = req.body;
        if (!reason || !String(reason).trim()) {
            await t.rollback();
            return next(new ErrorResponse('A cancellation reason is required', 400));
        }

        const interview = await Interview.findByPk(req.params.id, { include: interviewIncludes() });
        if (!interview) {
            await t.rollback();
            return next(new ErrorResponse('Interview not found', 404));
        }

        const actor = await buildActor(req.user);
        if (!interview.canBeCancelledBy(actor)) {
            await t.rollback();
            return next(new ErrorResponse(
                'You cannot cancel this interview (not allowed, past, or within 2 hours of start)',
                403
            ));
        }

        interview.status = 'cancelled';
        interview.cancellationReason = reason;
        await interview.save({ transaction: t });

        await t.commit();

        // Email the OTHER party
        const isCompanyActor = actor.role === 'company';
        const recipientEmail = isCompanyActor
            ? interview.student?.user?.email
            : interview.company?.contactEmail;
        const recipientName = isCompanyActor
            ? [interview.student?.firstName, interview.student?.lastName].filter(Boolean).join(' ')
            : interview.company?.companyName;

        safeSendEmail(
            recipientEmail,
            interviewCancelled({
                recipientName,
                companyName: interview.company?.companyName,
                taskTitle: interview.task?.title || 'a task',
                reason
            })
        );

        const fresh = await Interview.findByPk(interview.id, { include: interviewIncludes() });
        res.status(200).json({
            success: true,
            message: 'Interview cancelled',
            data: fresh.toJSON()
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// =========================
// COMPANY: complete
// =========================
exports.completeInterview = async (req, res, next) => {
    try {
        const company = await resolveCompany(req.user.id);
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const interview = await Interview.findByPk(req.params.id, { include: interviewIncludes() });
        if (!interview) return next(new ErrorResponse('Interview not found', 404));
        if (String(interview.companyId) !== String(company.id)) {
            return next(new ErrorResponse('Not authorized to complete this interview', 403));
        }
        if (!['scheduled', 'rescheduled'].includes(interview.status)) {
            return next(new ErrorResponse(
                `Cannot complete an interview with status '${interview.status}'`,
                400
            ));
        }

        const { companyFeedback, companyRating } = req.body;
        if (companyRating !== undefined && (companyRating < 1 || companyRating > 5)) {
            return next(new ErrorResponse('companyRating must be between 1 and 5', 400));
        }

        interview.status = 'completed';
        if (companyFeedback !== undefined) interview.companyFeedback = companyFeedback;
        if (companyRating !== undefined) interview.companyRating = companyRating;
        await interview.save();

        const fresh = await Interview.findByPk(interview.id, { include: interviewIncludes() });
        res.status(200).json({
            success: true,
            message: 'Interview marked as completed',
            data: fresh.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// =========================
// STUDENT: feedback
// =========================
exports.submitStudentFeedback = async (req, res, next) => {
    try {
        const student = await resolveStudent(req.user.id);
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const interview = await Interview.findByPk(req.params.id, { include: interviewIncludes() });
        if (!interview) return next(new ErrorResponse('Interview not found', 404));
        if (String(interview.studentId) !== String(student.id)) {
            return next(new ErrorResponse('Not authorized to submit feedback for this interview', 403));
        }
        if (interview.status !== 'completed') {
            return next(new ErrorResponse('Feedback can only be submitted after the interview is completed', 400));
        }

        const { studentFeedback, studentRating } = req.body;
        if (studentRating !== undefined && (studentRating < 1 || studentRating > 5)) {
            return next(new ErrorResponse('studentRating must be between 1 and 5', 400));
        }

        if (studentFeedback !== undefined) interview.studentFeedback = studentFeedback;
        if (studentRating !== undefined) interview.studentRating = studentRating;
        await interview.save();

        const fresh = await Interview.findByPk(interview.id, { include: interviewIncludes() });
        res.status(200).json({
            success: true,
            message: 'Feedback submitted',
            data: fresh.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// =========================
// list: my interviews (role auto-detected)
// =========================
exports.getMyInterviews = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 10,
            scope = 'upcoming'
        } = req.query;

        const where = {};
        if (req.user.role === 'student') {
            const student = await resolveStudent(req.user.id);
            if (!student) return next(new ErrorResponse('Student profile not found', 404));
            where.studentId = student.id;
        } else if (req.user.role === 'company') {
            const company = await resolveCompany(req.user.id);
            if (!company) return next(new ErrorResponse('Company profile not found', 404));
            where.companyId = company.id;
        } else {
            return next(new ErrorResponse('Only students and companies have interviews', 403));
        }

        const now = new Date();
        if (scope === 'upcoming') {
            where.scheduledAt = { [Op.gt]: now };
            where.status = { [Op.in]: ['scheduled', 'rescheduled'] };
        } else if (scope === 'past') {
            where[Op.or] = [
                { scheduledAt: { [Op.lte]: now } },
                { status: { [Op.in]: ['completed', 'cancelled', 'no_show'] } }
            ];
        }
        // scope === 'all' -> no extra filter

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const { rows, count } = await Interview.findAndCountAll({
            where,
            include: interviewIncludes(),
            order: [['scheduledAt', scope === 'past' ? 'DESC' : 'ASC']],
            offset,
            limit: parseInt(limit, 10),
            distinct: true
        });

        const totalPages = Math.ceil(count / parseInt(limit, 10));
        res.status(200).json({
            success: true,
            data: {
                interviews: rows.map((r) => r.toJSON()),
                pagination: {
                    currentPage: parseInt(page, 10),
                    totalPages,
                    totalInterviews: count,
                    hasNextPage: parseInt(page, 10) < totalPages,
                    hasPrevPage: parseInt(page, 10) > 1,
                    limit: parseInt(limit, 10)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// =========================
// single interview
// =========================
exports.getInterview = async (req, res, next) => {
    try {
        const interview = await Interview.findByPk(req.params.id, { include: interviewIncludes() });
        if (!interview) return next(new ErrorResponse('Interview not found', 404));

        const actor = await buildActor(req.user);
        if (req.user.role !== 'admin' && !interview.belongsToActor(actor)) {
            return next(new ErrorResponse('Not authorized to view this interview', 403));
        }

        res.status(200).json({ success: true, data: interview.toJSON() });
    } catch (error) {
        next(error);
    }
};

// =========================
// COMPANY: stats
// =========================
exports.getCompanyInterviewStats = async (req, res, next) => {
    try {
        const company = await resolveCompany(req.user.id);
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const baseWhere = { companyId: company.id };

        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const [byStatusRaw, upcomingThisWeek, ratingRow] = await Promise.all([
            Interview.findAll({
                attributes: ['status', [fn('COUNT', col('id')), 'count']],
                where: baseWhere,
                group: ['status'],
                raw: true
            }),
            Interview.count({
                where: {
                    ...baseWhere,
                    scheduledAt: { [Op.between]: [now, weekFromNow] },
                    status: { [Op.in]: ['scheduled', 'rescheduled'] }
                }
            }),
            Interview.findOne({
                attributes: [
                    [fn('AVG', col('companyRating')), 'avgCompany'],
                    [fn('AVG', col('studentRating')), 'avgStudent']
                ],
                where: baseWhere,
                raw: true
            })
        ]);

        const statusCounts = {
            scheduled: 0,
            rescheduled: 0,
            completed: 0,
            cancelled: 0,
            no_show: 0
        };
        byStatusRaw.forEach((r) => {
            statusCounts[r.status] = Number(r.count) || 0;
        });

        res.status(200).json({
            success: true,
            data: {
                statusCounts,
                upcomingThisWeek,
                averageCompanyRating: ratingRow && ratingRow.avgCompany ? Number(ratingRow.avgCompany) : 0,
                averageStudentRating: ratingRow && ratingRow.avgStudent ? Number(ratingRow.avgStudent) : 0
            }
        });
    } catch (error) {
        next(error);
    }
};
