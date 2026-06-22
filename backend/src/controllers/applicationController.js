const { Op, fn, col, literal } = require('sequelize');
const {
    sequelize,
    Application,
    ApplicationAttachment,
    ApplicationStatusHistory,
    Interview,
    Task,
    TaskSkill,
    TaskAttachment,
    Company,
    Student,
    StudentSkill,
    StudentExperience,
    StudentEducation
} = require('../models');
const ErrorResponse = require('../utils/errorResponse');
const {
    notifyStudentOfStatusChange,
    notifyCompanyOfWithdrawal
} = require('../utils/applicationNotifications');
const aiService = require('../services/aiService');
const { AIServiceUnavailableError } = aiService;

// Fire-and-forget match calc for a single new application.
// Never blocks the API response; logs on failure.
const scheduleMatchScoreForApplication = (applicationId, taskId, studentId) => {
    setImmediate(async () => {
        try {
            const [task, student] = await Promise.all([
                Task.findByPk(taskId, {
                    include: [{ model: TaskSkill, as: 'skillsRequired' }]
                }),
                Student.findByPk(studentId, {
                    include: [
                        { model: StudentSkill, as: 'skills' },
                        { model: StudentExperience, as: 'experience' },
                        { model: StudentEducation, as: 'education' }
                    ]
                })
            ]);
            if (!task || !student) return;

            const results = await aiService.matchTasksForStudent(
                aiService.mapStudentToDto(student),
                [aiService.mapTaskToDto(task)]
            );
            if (results.length === 0) return;
            await Application.update(
                { matchScore: results[0].score },
                { where: { id: applicationId } }
            );
        } catch (err) {
            console.warn(
                `[scheduleMatchScoreForApplication] application ${applicationId} not scored: ${err.message}`
            );
        }
    });
};

const STUDENT_BASIC_ATTRS = [
    'id', 'firstName', 'lastName', 'headline', 'profilePicture',
    'locationCity', 'locationCountry', 'profileCompletion'
];

const COMPANY_MIN_ATTRS = [
    'id', 'companyName', 'logo', 'industry',
    'locationCity', 'locationState', 'locationCountry',
    'verificationIsVerified'
];

const VALID_TRANSITIONS = {
    submitted: ['under_review', 'shortlisted', 'rejected'],
    under_review: ['shortlisted', 'rejected'],
    shortlisted: ['interview_scheduled', 'rejected', 'accepted'],
    interview_scheduled: ['accepted', 'rejected']
};

const TERMINAL_STATUSES = ['accepted', 'rejected'];

// Translate Mongo-style body into Sequelize columns
const flattenApplicationBody = (body = {}) => {
    const out = {};
    const passthrough = [
        'coverLetter', 'proposedRate', 'proposedCurrency',
        'expectedStartDate', 'availabilityHoursPerWeek',
        'resumeUrl', 'portfolioUrl'
    ];
    passthrough.forEach((k) => { if (body[k] !== undefined) out[k] = body[k]; });

    if (body.proposed && typeof body.proposed === 'object') {
        if (body.proposed.rate !== undefined) out.proposedRate = body.proposed.rate;
        if (body.proposed.currency !== undefined) out.proposedCurrency = body.proposed.currency;
    }

    return out;
};

// Remove company-private fields when returning to a student
const sanitizeForStudent = (json) => {
    if (!json) return json;
    delete json.companyNotes;
    if (json.status !== 'rejected') {
        delete json.rejectionReason;
    }
    return json;
};

const studentApplicationIncludes = () => ([
    {
        model: Task,
        as: 'task',
        include: [
            { model: TaskSkill, as: 'skillsRequired' },
            { model: Company, as: 'company', attributes: COMPANY_MIN_ATTRS }
        ]
    },
    { model: ApplicationAttachment, as: 'attachments' }
]);

const resolveStudent = async (userId) => Student.findOne({ where: { userId } });
const resolveCompany = async (userId) => Company.findOne({ where: { userId } });

// =========================
// STUDENT
// =========================

exports.applyToTask = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const student = await resolveStudent(req.user.id);
        if (!student) {
            await t.rollback();
            return next(new ErrorResponse('Student profile not found', 404));
        }

        const task = await Task.findByPk(req.params.taskId);
        if (!task) {
            await t.rollback();
            return next(new ErrorResponse('Task not found', 404));
        }

        if (!task.canApply()) {
            await t.rollback();
            return next(new ErrorResponse(
                'This task is not currently accepting applications',
                400
            ));
        }

        const existing = await Application.findOne({
            where: { taskId: task.id, studentId: student.id }
        });
        if (existing) {
            await t.rollback();
            return next(new ErrorResponse('You have already applied to this task', 400));
        }

        const data = flattenApplicationBody(req.body);
        data.taskId = task.id;
        data.studentId = student.id;
        data.status = 'submitted';
        data.submittedAt = new Date();

        const application = await Application.create(data, { transaction: t });

        if (Array.isArray(req.body.attachments) && req.body.attachments.length > 0) {
            await ApplicationAttachment.bulkCreate(
                req.body.attachments.map((a) => ({
                    applicationId: application.id,
                    name: a.name,
                    url: a.url,
                    type: a.type
                })),
                { transaction: t }
            );
        }

        await ApplicationStatusHistory.create({
            applicationId: application.id,
            fromStatus: null,
            toStatus: 'submitted',
            changedByUserId: req.user.id,
            reason: null
        }, { transaction: t });

        await task.increment('applicationCount', { by: 1, transaction: t });

        await t.commit();

        // Kick off match-score calc in the background (best-effort).
        scheduleMatchScoreForApplication(application.id, task.id, student.id);

        const fresh = await Application.findByPk(application.id, {
            include: studentApplicationIncludes()
        });

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: sanitizeForStudent(fresh.toJSON())
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

exports.getMyApplications = async (req, res, next) => {
    try {
        const student = await resolveStudent(req.user.id);
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const {
            page = 1,
            limit = 10,
            status = 'all',
            sortBy = 'submittedAt',
            sortOrder = 'desc'
        } = req.query;

        const where = { studentId: student.id };
        if (status !== 'all') where.status = status;

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        const { rows, count } = await Application.findAndCountAll({
            where,
            include: studentApplicationIncludes(),
            order: [[sortBy, sortOrder === 'desc' ? 'DESC' : 'ASC']],
            offset,
            limit: parseInt(limit, 10),
            distinct: true,
            subQuery: false
        });

        const totalPages = Math.ceil(count / parseInt(limit, 10));

        res.status(200).json({
            success: true,
            data: {
                applications: rows.map((a) => sanitizeForStudent(a.toJSON())),
                pagination: {
                    currentPage: parseInt(page, 10),
                    totalPages,
                    totalApplications: count,
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

exports.getMyApplication = async (req, res, next) => {
    try {
        const student = await resolveStudent(req.user.id);
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const application = await Application.findByPk(req.params.id, {
            include: [
                ...studentApplicationIncludes(),
                { model: ApplicationStatusHistory, as: 'statusHistory' }
            ],
            order: [[{ model: ApplicationStatusHistory, as: 'statusHistory' }, 'createdAt', 'ASC']]
        });

        if (!application) return next(new ErrorResponse('Application not found', 404));
        if (String(application.studentId) !== String(student.id)) {
            return next(new ErrorResponse('Not authorized to view this application', 403));
        }

        res.status(200).json({
            success: true,
            data: sanitizeForStudent(application.toJSON())
        });
    } catch (error) {
        next(error);
    }
};

exports.updateMyApplication = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const student = await resolveStudent(req.user.id);
        if (!student) {
            await t.rollback();
            return next(new ErrorResponse('Student profile not found', 404));
        }

        const application = await Application.findByPk(req.params.id);
        if (!application) {
            await t.rollback();
            return next(new ErrorResponse('Application not found', 404));
        }

        if (String(application.studentId) !== String(student.id)) {
            await t.rollback();
            return next(new ErrorResponse('Not authorized to update this application', 403));
        }

        if (!application.canBeEditedByStudent()) {
            await t.rollback();
            return next(new ErrorResponse(
                'This application can no longer be edited',
                400
            ));
        }

        const flat = flattenApplicationBody(req.body);
        const editable = [
            'coverLetter', 'proposedRate', 'expectedStartDate',
            'availabilityHoursPerWeek', 'portfolioUrl'
        ];
        const updates = {};
        editable.forEach((k) => { if (flat[k] !== undefined) updates[k] = flat[k]; });

        await application.update(updates, { transaction: t });

        if (Array.isArray(req.body.attachments)) {
            await ApplicationAttachment.destroy({
                where: { applicationId: application.id },
                transaction: t
            });
            if (req.body.attachments.length > 0) {
                await ApplicationAttachment.bulkCreate(
                    req.body.attachments.map((a) => ({
                        applicationId: application.id,
                        name: a.name,
                        url: a.url,
                        type: a.type
                    })),
                    { transaction: t }
                );
            }
        }

        await t.commit();

        const fresh = await Application.findByPk(application.id, {
            include: studentApplicationIncludes()
        });

        res.status(200).json({
            success: true,
            message: 'Application updated successfully',
            data: sanitizeForStudent(fresh.toJSON())
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

exports.withdrawMyApplication = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const student = await resolveStudent(req.user.id);
        if (!student) {
            await t.rollback();
            return next(new ErrorResponse('Student profile not found', 404));
        }

        const application = await Application.findByPk(req.params.id);
        if (!application) {
            await t.rollback();
            return next(new ErrorResponse('Application not found', 404));
        }

        if (String(application.studentId) !== String(student.id)) {
            await t.rollback();
            return next(new ErrorResponse('Not authorized to withdraw this application', 403));
        }

        if (!application.canBeWithdrawnByStudent()) {
            await t.rollback();
            return next(new ErrorResponse(
                'This application can no longer be withdrawn',
                400
            ));
        }

        const fromStatus = application.status;
        application.status = 'withdrawn';
        await application.save({ transaction: t });

        await ApplicationStatusHistory.create({
            applicationId: application.id,
            fromStatus,
            toStatus: 'withdrawn',
            changedByUserId: req.user.id,
            reason: req.body && req.body.reason ? req.body.reason : null
        }, { transaction: t });

        const task = await Task.findByPk(application.taskId);
        if (task && task.applicationCount > 0) {
            await task.decrement('applicationCount', { by: 1, transaction: t });
        }

        await t.commit();

        notifyCompanyOfWithdrawal(
            application.id,
            req.body && req.body.reason ? req.body.reason : null
        );

        const fresh = await Application.findByPk(application.id, {
            include: studentApplicationIncludes()
        });

        res.status(200).json({
            success: true,
            message: 'Application withdrawn successfully',
            data: sanitizeForStudent(fresh.toJSON())
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// =========================
// COMPANY
// =========================

exports.getApplicationsForTask = async (req, res, next) => {
    try {
        const company = await resolveCompany(req.user.id);
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const task = await Task.findByPk(req.params.taskId);
        if (!task) return next(new ErrorResponse('Task not found', 404));
        if (String(task.companyId) !== String(company.id)) {
            return next(new ErrorResponse('Not authorized to view applications for this task', 403));
        }

        const {
            page = 1,
            limit = 10,
            status = 'all',
            sortBy = 'submittedAt',
            sortOrder = 'desc'
        } = req.query;

        const allowedSort = ['submittedAt', 'matchScore', 'createdAt', 'status'];
        const orderField = allowedSort.includes(sortBy) ? sortBy : 'submittedAt';

        const where = { taskId: task.id };
        if (status !== 'all') where.status = status;

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        const { rows, count } = await Application.findAndCountAll({
            where,
            include: [
                { model: Student, as: 'student', attributes: STUDENT_BASIC_ATTRS },
                { model: ApplicationAttachment, as: 'attachments' }
            ],
            order: [[orderField, sortOrder === 'desc' ? 'DESC' : 'ASC']],
            offset,
            limit: parseInt(limit, 10),
            distinct: true,
            subQuery: false
        });

        // Backfill matchScore for any rows on this page that don't have one yet.
        const needsScoring = rows.filter((a) => a.matchScore == null);
        if (needsScoring.length > 0) {
            try {
                const taskFull = await Task.findByPk(task.id, {
                    include: [{ model: TaskSkill, as: 'skillsRequired' }]
                });
                const studentsFull = await Student.findAll({
                    where: { id: { [Op.in]: needsScoring.map((a) => a.studentId) } },
                    include: [
                        { model: StudentSkill, as: 'skills' },
                        { model: StudentExperience, as: 'experience' },
                        { model: StudentEducation, as: 'education' }
                    ]
                });
                const ranking = await aiService.rankCandidates(
                    aiService.mapTaskToDto(taskFull),
                    studentsFull.map(aiService.mapStudentToDto)
                );
                const scoreByStudentId = new Map(
                    ranking.map((r) => [String(r.student_id), r.score])
                );
                await Promise.all(needsScoring.map(async (app) => {
                    const score = scoreByStudentId.get(String(app.studentId));
                    if (typeof score === 'number') {
                        app.matchScore = score;
                        await Application.update(
                            { matchScore: score },
                            { where: { id: app.id } }
                        );
                    }
                }));
            } catch (err) {
                if (err instanceof AIServiceUnavailableError) {
                    console.warn('[getApplicationsForTask] AI scoring skipped:', err.message);
                } else {
                    throw err;
                }
            }
        }

        const totalPages = Math.ceil(count / parseInt(limit, 10));

        res.status(200).json({
            success: true,
            data: {
                applications: rows.map((a) => a.toJSON()),
                pagination: {
                    currentPage: parseInt(page, 10),
                    totalPages,
                    totalApplications: count,
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

exports.getApplication = async (req, res, next) => {
    try {
        const company = await resolveCompany(req.user.id);
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const application = await Application.findByPk(req.params.id, {
            include: [
                {
                    model: Task,
                    as: 'task',
                    include: [
                        { model: TaskSkill, as: 'skillsRequired' },
                        { model: Company, as: 'company', attributes: COMPANY_MIN_ATTRS }
                    ]
                },
                {
                    model: Student,
                    as: 'student',
                    attributes: STUDENT_BASIC_ATTRS.concat(['bio', 'resumeUrl']),
                    include: [
                        { model: StudentSkill, as: 'skills' },
                        { model: StudentEducation, as: 'education' }
                    ]
                },
                { model: ApplicationAttachment, as: 'attachments' },
                { model: ApplicationStatusHistory, as: 'statusHistory' },
                { model: Interview, as: 'interview' }
            ],
            order: [[{ model: ApplicationStatusHistory, as: 'statusHistory' }, 'createdAt', 'ASC']]
        });

        if (!application) return next(new ErrorResponse('Application not found', 404));
        if (!application.task || String(application.task.companyId) !== String(company.id)) {
            return next(new ErrorResponse('Not authorized to view this application', 403));
        }

        if (!application.viewedByCompanyAt) {
            application.viewedByCompanyAt = new Date();
            await application.save();
        }

        res.status(200).json({
            success: true,
            data: application.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

exports.updateApplicationStatus = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const company = await resolveCompany(req.user.id);
        if (!company) {
            await t.rollback();
            return next(new ErrorResponse('Company profile not found', 404));
        }

        const { status, reason } = req.body;
        if (!status) {
            await t.rollback();
            return next(new ErrorResponse('Status is required', 400));
        }

        const application = await Application.findByPk(req.params.id, {
            include: [{ model: Task, as: 'task', attributes: ['id', 'companyId'] }]
        });

        if (!application) {
            await t.rollback();
            return next(new ErrorResponse('Application not found', 404));
        }

        if (!application.task || String(application.task.companyId) !== String(company.id)) {
            await t.rollback();
            return next(new ErrorResponse('Not authorized to update this application', 403));
        }

        const fromStatus = application.status;
        const allowed = VALID_TRANSITIONS[fromStatus] || [];
        if (!allowed.includes(status)) {
            await t.rollback();
            return next(new ErrorResponse(
                `Invalid status transition from '${fromStatus}' to '${status}'`,
                400
            ));
        }

        application.status = status;
        if (TERMINAL_STATUSES.includes(status) && !application.decidedAt) {
            application.decidedAt = new Date();
        }
        if (status === 'rejected' && reason) {
            application.rejectionReason = reason;
        }

        await application.save({ transaction: t });

        await ApplicationStatusHistory.create({
            applicationId: application.id,
            fromStatus,
            toStatus: status,
            changedByUserId: req.user.id,
            reason: reason || null
        }, { transaction: t });

        await t.commit();

        notifyStudentOfStatusChange(application.id, fromStatus, status, reason || null);

        const fresh = await Application.findByPk(application.id, {
            include: [
                { model: Student, as: 'student', attributes: STUDENT_BASIC_ATTRS },
                { model: ApplicationAttachment, as: 'attachments' },
                { model: ApplicationStatusHistory, as: 'statusHistory' }
            ],
            order: [[{ model: ApplicationStatusHistory, as: 'statusHistory' }, 'createdAt', 'ASC']]
        });

        res.status(200).json({
            success: true,
            message: 'Application status updated',
            data: fresh.toJSON()
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

exports.updateCompanyNotes = async (req, res, next) => {
    try {
        const company = await resolveCompany(req.user.id);
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const application = await Application.findByPk(req.params.id, {
            include: [{ model: Task, as: 'task', attributes: ['id', 'companyId'] }]
        });

        if (!application) return next(new ErrorResponse('Application not found', 404));
        if (!application.task || String(application.task.companyId) !== String(company.id)) {
            return next(new ErrorResponse('Not authorized to update notes for this application', 403));
        }

        application.companyNotes = req.body.companyNotes != null ? req.body.companyNotes : null;
        await application.save();

        res.status(200).json({
            success: true,
            message: 'Company notes updated',
            data: { _id: application.id, id: application.id, companyNotes: application.companyNotes }
        });
    } catch (error) {
        next(error);
    }
};

// Infer a friendly "type" from a filename extension
const inferAttachmentType = (filename = '', mimetype = '') => {
    const ext = filename.toLowerCase().split('.').pop();
    if (['pdf', 'doc', 'docx'].includes(ext)) return 'document';
    if (['jpg', 'jpeg', 'png'].includes(ext)) return 'image';
    if (ext === 'zip') return 'archive';
    if (mimetype.startsWith('image/')) return 'image';
    return 'other';
};

exports.uploadAttachments = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return next(new ErrorResponse('No files uploaded', 400));
        }
        const items = req.files.map((file) => ({
            name: file.originalname,
            url: `/uploads/application-attachments/${file.filename}`,
            type: inferAttachmentType(file.originalname, file.mimetype),
            size: file.size
        }));
        res.status(200).json({
            success: true,
            message: 'Uploaded successfully',
            data: items
        });
    } catch (error) {
        next(error);
    }
};

exports.getApplicationStats = async (req, res, next) => {
    try {
        const company = await resolveCompany(req.user.id);
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const taskIdRows = await Task.findAll({
            where: { companyId: company.id },
            attributes: ['id'],
            raw: true
        });
        const taskIds = taskIdRows.map((r) => r.id);

        if (taskIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    totalApplications: 0,
                    applicationsByStatus: [],
                    averageMatchScore: 0,
                    last7DaysTrend: []
                }
            });
        }

        const baseWhere = { taskId: { [Op.in]: taskIds } };

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const [totalApplications, byStatusRaw, avgScoreRaw, trendRaw] = await Promise.all([
            Application.count({ where: baseWhere }),

            Application.findAll({
                attributes: ['status', [fn('COUNT', col('id')), 'count']],
                where: baseWhere,
                group: ['status'],
                raw: true
            }),

            Application.findOne({
                attributes: [[fn('AVG', col('matchScore')), 'avg']],
                where: { ...baseWhere, matchScore: { [Op.ne]: null } },
                raw: true
            }),

            Application.findAll({
                attributes: [
                    [fn('DATE', col('submittedAt')), 'day'],
                    [fn('COUNT', col('id')), 'count']
                ],
                where: { ...baseWhere, submittedAt: { [Op.gte]: sevenDaysAgo } },
                group: [literal('DATE(`submittedAt`)')],
                order: [[literal('DATE(`submittedAt`)'), 'ASC']],
                raw: true
            })
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalApplications,
                applicationsByStatus: byStatusRaw.map((r) => ({
                    _id: r.status,
                    count: Number(r.count)
                })),
                averageMatchScore: avgScoreRaw && avgScoreRaw.avg ? Number(avgScoreRaw.avg) : 0,
                last7DaysTrend: trendRaw.map((r) => ({
                    date: r.day,
                    count: Number(r.count)
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};
