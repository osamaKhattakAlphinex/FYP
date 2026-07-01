const { Op } = require('sequelize');
const {
    sequelize,
    Task,
    TaskSkill,
    TaskAttachment,
    Company,
    Student,
    StudentSkill,
    StudentExperience,
    StudentEducation,
    Application
} = require('../models');
const ErrorResponse = require('../utils/errorResponse');
const aiService = require('../services/aiService');
const { AIServiceUnavailableError } = aiService;

// Translate Mongo-style body fields into Sequelize columns
const flattenTaskBody = (body = {}) => {
    const out = {};
    const passthrough = [
        'title', 'description', 'category', 'subcategory', 'companyId', 'type',
        'workType', 'experienceLevel', 'requirements',
        'applicationDeadline', 'startDate', 'endDate',
        'status', 'isPublic', 'isFeatured', 'maxApplications', 'applicationCount',
        'deliverables', 'benefits', 'tags', 'views', 'saves', 'publishedAt', 'closedAt'
    ];
    passthrough.forEach((k) => { if (body[k] !== undefined) out[k] = body[k]; });

    if (body.duration && typeof body.duration === 'object') {
        if (body.duration.value !== undefined) out.durationValue = body.duration.value;
        if (body.duration.unit !== undefined) out.durationUnit = body.duration.unit;
    }
    if (body.budget && typeof body.budget === 'object') {
        if (body.budget.type !== undefined) out.budgetType = body.budget.type;
        if (body.budget.currency !== undefined) out.budgetCurrency = body.budget.currency;
        if (body.budget.amount && typeof body.budget.amount === 'object') {
            if (body.budget.amount.min !== undefined) out.budgetAmountMin = body.budget.amount.min;
            if (body.budget.amount.max !== undefined) out.budgetAmountMax = body.budget.amount.max;
        }
    }
    if (body.location && typeof body.location === 'object') {
        if (body.location.city !== undefined) out.locationCity = body.location.city;
        if (body.location.state !== undefined) out.locationState = body.location.state;
        if (body.location.country !== undefined) out.locationCountry = body.location.country;
        if (body.location.timezone !== undefined) out.locationTimezone = body.location.timezone;
    }

    return out;
};

const taskIncludes = (companyAttrs) => ([
    { model: TaskSkill, as: 'skillsRequired' },
    { model: TaskAttachment, as: 'attachments' },
    {
        model: Company,
        as: 'company',
        attributes: companyAttrs || [
            'id', 'companyName', 'logo', 'industry',
            'locationCity', 'locationState', 'locationCountry',
            'verificationIsVerified'
        ]
    }
]);

// Apply Mongo-style filters in req.query to Sequelize where clause
const buildListWhere = (q) => {
    const where = {
        status: 'active',
        isPublic: true,
        applicationDeadline: { [Op.gt]: new Date() }
    };

    if (q.category && q.category !== 'all') where.category = q.category;
    if (q.workType && q.workType !== 'all') where.workType = q.workType;
    if (q.experienceLevel && q.experienceLevel !== 'all') where.experienceLevel = q.experienceLevel;

    if (q.budget && q.budget !== 'all') {
        switch (q.budget) {
            case 'unpaid':
                where.budgetType = 'unpaid';
                break;
            case 'under-500':
                where.budgetAmountMax = { [Op.lt]: 500 };
                break;
            case '500-1000':
                where.budgetAmountMin = { [Op.gte]: 500 };
                where.budgetAmountMax = { [Op.lte]: 1000 };
                break;
            case 'over-1000':
                where.budgetAmountMin = { [Op.gt]: 1000 };
                break;
        }
    }

    if (q.location && q.location !== 'all') {
        if (q.location === 'remote') {
            where.workType = 'remote';
        } else {
            where.locationCountry = { [Op.like]: `%${q.location}%` };
        }
    }

    if (q.search) {
        where[Op.or] = [
            { title: { [Op.like]: `%${q.search}%` } },
            { description: { [Op.like]: `%${q.search}%` } },
            { tags: { [Op.like]: `%${q.search}%` } }
        ];
    }

    return where;
};

// Real Task columns we allow DB-level ordering on. The virtual match sorts
// ('recommended'/'matchScore'/'match') are handled in memory after scoring.
const TASK_SORT_COLUMNS = ['createdAt', 'updatedAt', 'views', 'applicationDeadline', 'applicationCount'];
const MATCH_SORT_KEYS = ['recommended', 'matchScore', 'match'];

// Load a Student row with the includes the matcher needs, or null.
const loadStudentForMatching = async (userId) =>
    Student.findOne({
        where: { userId },
        include: [
            { model: StudentSkill, as: 'skills' },
            { model: StudentExperience, as: 'experience' },
            { model: StudentEducation, as: 'education' }
        ]
    });

// Score Task instances for a student. Returns Map<String(task.id), {score, reasons}>.
// Throws AIServiceUnavailableError if the AI service can't be reached.
const scoreTasksForStudent = async (student, tasks) => {
    if (!Array.isArray(tasks) || tasks.length === 0) return new Map();
    const studentDto = aiService.mapStudentToDto(student);
    const taskDtos = tasks.map(aiService.mapTaskToDto);
    const results = await aiService.matchTasksForStudent(studentDto, taskDtos);
    return new Map(results.map((r) => [String(r.task_id), r]));
};

// Serialise a task and attach its matchScore/matchReasons from a score map.
const withMatch = (task, scoreMap, { defaultZero = false } = {}) => {
    const json = task.toJSON();
    if (json.company) json.companyId = json.company;
    const s = scoreMap.get(String(task.id));
    if (s) {
        json.matchScore = s.score;
        json.matchReasons = Array.isArray(s.reasons) ? s.reasons : [];
    } else if (defaultZero) {
        json.matchScore = 0;
        json.matchReasons = [];
    }
    return json;
};

// @desc    Get all public tasks with filtering and pagination
// For a logged-in student, every task carries an AI matchScore + matchReasons,
// and the 'recommended'/'matchScore' sorts rank the whole candidate pool by score.
exports.getTasks = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 12;
        const { skills, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        const where = buildListWhere(req.query);
        const include = taskIncludes();

        if (skills) {
            const skillsArray = skills.split(',').map((s) => s.trim()).filter(Boolean);
            include[0] = {
                model: TaskSkill,
                as: 'skillsRequired',
                required: true,
                where: { name: { [Op.in]: skillsArray } }
            };
        }

        const isStudent = !!(req.user && req.user.role === 'student');
        const wantsMatchSort = MATCH_SORT_KEYS.includes(sortBy);
        let student = null;
        if (isStudent) {
            try { student = await loadStudentForMatching(req.user.id); } catch (e) { student = null; }
        }

        // --- Match-ranked path: score a candidate pool, sort by score, paginate in memory ---
        if (isStudent && student && wantsMatchSort) {
            const POOL_LIMIT = 100;
            const candidates = await Task.findAll({
                where,
                include,
                order: [['createdAt', 'DESC']],
                limit: POOL_LIMIT,
                subQuery: false
            });

            try {
                const scoreMap = await scoreTasksForStudent(student, candidates);
                const sorted = [...candidates].sort((a, b) => {
                    const sa = scoreMap.get(String(a.id));
                    const sb = scoreMap.get(String(b.id));
                    return (sb ? sb.score : -1) - (sa ? sa.score : -1);
                });

                const total = sorted.length;
                const totalPages = Math.ceil(total / limit) || 1;
                const offset = (page - 1) * limit;
                const tasks = sorted
                    .slice(offset, offset + limit)
                    .map((t) => withMatch(t, scoreMap, { defaultZero: true }));

                return res.status(200).json({
                    success: true,
                    data: {
                        tasks,
                        pagination: {
                            currentPage: page,
                            totalPages,
                            totalTasks: total,
                            hasNextPage: page < totalPages,
                            hasPrevPage: page > 1,
                            limit
                        }
                    }
                });
            } catch (err) {
                if (!(err instanceof AIServiceUnavailableError)) throw err;
                // AI service down — fall through to the standard listing below.
            }
        }

        // --- Standard path: DB sort + paginate, then best-effort attach scores ---
        const orderField = TASK_SORT_COLUMNS.includes(sortBy) ? sortBy : 'createdAt';
        const offset = (page - 1) * limit;

        const { rows, count } = await Task.findAndCountAll({
            where,
            include,
            order: [[orderField, sortOrder === 'desc' ? 'DESC' : 'ASC']],
            offset,
            limit,
            distinct: true,
            subQuery: false
        });

        const totalPages = Math.ceil(count / limit) || 1;

        let scoreMap = new Map();
        if (isStudent && student && rows.length > 0) {
            try {
                scoreMap = await scoreTasksForStudent(student, rows);
            } catch (err) {
                if (!(err instanceof AIServiceUnavailableError)) throw err;
                scoreMap = new Map();
            }
        }

        const tasks = rows.map((t) =>
            withMatch(t, scoreMap, { defaultZero: scoreMap.size > 0 })
        );

        res.status(200).json({
            success: true,
            data: {
                tasks,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalTasks: count,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                    limit
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single task by ID
exports.getTask = async (req, res, next) => {
    try {
        const task = await Task.findByPk(req.params.id, {
            include: taskIncludes([
                'id', 'companyName', 'logo', 'industry', 'description', 'website',
                'locationCity', 'locationState', 'locationCountry', 'verificationIsVerified',
                'socialLinkedin', 'socialTwitter', 'socialFacebook', 'socialInstagram'
            ])
        });

        if (!task) return next(new ErrorResponse('Task not found', 404));
        if (!task.isPublic || task.status !== 'active') {
            return next(new ErrorResponse('Task not available', 403));
        }

        const json = task.toJSON();
        if (json.company) json.companyId = json.company;

        // Personalise with an AI match score when a student is viewing.
        if (req.user && req.user.role === 'student') {
            try {
                const student = await loadStudentForMatching(req.user.id);
                if (student) {
                    const scoreMap = await scoreTasksForStudent(student, [task]);
                    const s = scoreMap.get(String(task.id));
                    if (s) {
                        json.matchScore = s.score;
                        json.matchReasons = Array.isArray(s.reasons) ? s.reasons : [];
                    }
                }
            } catch (err) {
                if (!(err instanceof AIServiceUnavailableError)) throw err;
                // AI service down — return the task without a score.
            }
        }

        res.status(200).json({ success: true, data: json });
    } catch (error) {
        next(error);
    }
};

// @desc    Track unique view
exports.trackTaskView = async (req, res, next) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) return next(new ErrorResponse('Task not found', 404));

        const isNewView = await task.trackUniqueView(req.user.id);

        res.status(200).json({
            success: true,
            data: { views: task.views, isNewView }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new task
exports.createTask = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const company = await Company.findOne({ where: { userId: req.user.id } });
        if (!company) {
            await t.rollback();
            return next(new ErrorResponse('Company profile not found', 404));
        }

        const data = flattenTaskBody(req.body);
        data.companyId = company.id;

        const task = await Task.create(data, { transaction: t });

        const skills = req.body.skillsRequired;
        if (Array.isArray(skills) && skills.length > 0) {
            await TaskSkill.bulkCreate(
                skills.map((s) => ({
                    taskId: task.id,
                    name: s.name,
                    level: s.level || 'intermediate',
                    required: s.required !== undefined ? !!s.required : true
                })),
                { transaction: t }
            );
        }

        if (Array.isArray(req.body.attachments) && req.body.attachments.length > 0) {
            await TaskAttachment.bulkCreate(
                req.body.attachments.map((a) => ({
                    taskId: task.id,
                    name: a.name,
                    url: a.url,
                    type: a.type
                })),
                { transaction: t }
            );
        }

        await t.commit();

        const fresh = await Task.findByPk(task.id, { include: taskIncludes() });
        const json = fresh.toJSON();
        if (json.company) json.companyId = json.company;

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: json
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// @desc    Update task
exports.updateTask = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) {
            await t.rollback();
            return next(new ErrorResponse('Task not found', 404));
        }

        const company = await Company.findOne({ where: { userId: req.user.id } });
        if (!company) {
            await t.rollback();
            return next(new ErrorResponse('Company profile not found', 404));
        }

        if (String(task.companyId) !== String(company.id)) {
            await t.rollback();
            return next(new ErrorResponse('Not authorized to update this task', 403));
        }

        const updates = flattenTaskBody(req.body);
        await task.update(updates, { transaction: t });

        if (Array.isArray(req.body.skillsRequired)) {
            await TaskSkill.destroy({ where: { taskId: task.id }, transaction: t });
            if (req.body.skillsRequired.length > 0) {
                await TaskSkill.bulkCreate(
                    req.body.skillsRequired.map((s) => ({
                        taskId: task.id,
                        name: s.name,
                        level: s.level || 'intermediate',
                        required: s.required !== undefined ? !!s.required : true
                    })),
                    { transaction: t }
                );
            }
        }

        if (Array.isArray(req.body.attachments)) {
            await TaskAttachment.destroy({ where: { taskId: task.id }, transaction: t });
            if (req.body.attachments.length > 0) {
                await TaskAttachment.bulkCreate(
                    req.body.attachments.map((a) => ({
                        taskId: task.id,
                        name: a.name,
                        url: a.url,
                        type: a.type
                    })),
                    { transaction: t }
                );
            }
        }

        await t.commit();

        const fresh = await Task.findByPk(task.id, { include: taskIncludes() });
        const json = fresh.toJSON();
        if (json.company) json.companyId = json.company;

        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            data: json
        });
    } catch (error) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        next(error);
    }
};

// @desc    Delete task
exports.deleteTask = async (req, res, next) => {
    try {
        const task = await Task.findByPk(req.params.id);
        if (!task) return next(new ErrorResponse('Task not found', 404));

        const company = await Company.findOne({ where: { userId: req.user.id } });
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        if (String(task.companyId) !== String(company.id)) {
            return next(new ErrorResponse('Not authorized to delete this task', 403));
        }

        await task.destroy();

        res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Get company's tasks
exports.getMyTasks = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 10,
            status = 'all',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const company = await Company.findOne({ where: { userId: req.user.id } });
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const where = { companyId: company.id };
        if (status !== 'all') where.status = status;

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        const { rows, count } = await Task.findAndCountAll({
            where,
            include: [{ model: TaskSkill, as: 'skillsRequired' }],
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
                tasks: rows.map((t) => t.toJSON()),
                pagination: {
                    currentPage: parseInt(page, 10),
                    totalPages,
                    totalTasks: count,
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

// @desc    Get task statistics
exports.getTaskStats = async (req, res, next) => {
    try {
        const baseWhere = { status: 'active', isPublic: true };

        const [totalActiveTasks, tasksByCategoryRaw, tasksByWorkTypeRaw, avgBudgetRaw] = await Promise.all([
            Task.count({ where: baseWhere }),

            Task.findAll({
                attributes: ['category', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                where: baseWhere,
                group: ['category'],
                order: [[sequelize.literal('count'), 'DESC']],
                raw: true
            }),

            Task.findAll({
                attributes: ['workType', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                where: baseWhere,
                group: ['workType'],
                raw: true
            }),

            Task.findOne({
                attributes: [
                    [sequelize.fn('AVG', sequelize.col('budgetAmountMin')), 'avgMin'],
                    [sequelize.fn('AVG', sequelize.col('budgetAmountMax')), 'avgMax']
                ],
                where: { ...baseWhere, budgetType: { [Op.ne]: 'unpaid' } },
                raw: true
            })
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalActiveTasks,
                tasksByCategory: tasksByCategoryRaw.map((r) => ({ _id: r.category, count: Number(r.count) })),
                tasksByWorkType: tasksByWorkTypeRaw.map((r) => ({ _id: r.workType, count: Number(r.count) })),
                averageBudget: {
                    avgMin: avgBudgetRaw && avgBudgetRaw.avgMin ? Number(avgBudgetRaw.avgMin) : 0,
                    avgMax: avgBudgetRaw && avgBudgetRaw.avgMax ? Number(avgBudgetRaw.avgMax) : 0
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Search tasks
exports.searchTasks = async (req, res, next) => {
    try {
        const {
            query,
            filters = {},
            page = 1,
            limit = 12,
            sortBy = 'relevance'
        } = req.body;

        const where = {
            status: 'active',
            isPublic: true,
            applicationDeadline: { [Op.gt]: new Date() }
        };

        if (query) {
            where[Op.or] = [
                { title: { [Op.like]: `%${query}%` } },
                { description: { [Op.like]: `%${query}%` } },
                { tags: { [Op.like]: `%${query}%` } }
            ];
        }

        // shallow merge of additional filters that already use SQL column names
        Object.assign(where, filters);

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const order = sortBy === 'relevance' ? [['createdAt', 'DESC']] : [[sortBy, 'DESC']];

        const { rows, count } = await Task.findAndCountAll({
            where,
            include: taskIncludes(),
            order,
            offset,
            limit: parseInt(limit, 10),
            distinct: true,
            subQuery: false
        });

        res.status(200).json({
            success: true,
            data: {
                tasks: rows.map((t) => {
                    const json = t.toJSON();
                    if (json.company) json.companyId = json.company;
                    return json;
                }),
                pagination: {
                    currentPage: parseInt(page, 10),
                    totalPages: Math.ceil(count / parseInt(limit, 10)),
                    totalTasks: count,
                    limit: parseInt(limit, 10)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// Naive fallback used when the AI service is unavailable.
const naiveRecommendationFallback = (tasks, limit) =>
    tasks.slice(0, limit).map((t) => {
        const json = t.toJSON();
        delete json.applications; // strip the left-join probe rows
        if (json.company) json.companyId = json.company;
        json.matchScore = null;
        json.matchReasons = [];
        return json;
    });

// @desc    Get AI-ranked recommended tasks for the current student
exports.getRecommendedTasks = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 10;

        const student = await Student.findOne({
            where: { userId: req.user.id },
            include: [
                { model: StudentSkill, as: 'skills' },
                { model: StudentExperience, as: 'experience' },
                { model: StudentEducation, as: 'education' }
            ]
        });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        // Up to 100 candidates: active, public, deadline > now, NOT already applied to.
        // Left-join Application filtered by this student, then keep rows where the join is empty.
        const candidates = await Task.findAll({
            where: {
                status: 'active',
                isPublic: true,
                applicationDeadline: { [Op.gt]: new Date() }
            },
            include: [
                { model: TaskSkill, as: 'skillsRequired' },
                {
                    model: Application,
                    as: 'applications',
                    required: false,
                    where: { studentId: student.id },
                    attributes: ['id']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 100,
            subQuery: false
        });

        const notApplied = candidates.filter(
            (t) => !Array.isArray(t.applications) || t.applications.length === 0
        );

        if (notApplied.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        let topScores;
        try {
            const studentDto = aiService.mapStudentToDto(student);
            const taskDtos = notApplied.map(aiService.mapTaskToDto);
            const results = await aiService.matchTasksForStudent(studentDto, taskDtos);
            topScores = results.slice(0, limit);
        } catch (err) {
            if (err instanceof AIServiceUnavailableError) {
                console.warn('[getRecommendedTasks] AI service unavailable — falling back to latest createdAt ordering:', err.message);
                return res.status(200).json({
                    success: true,
                    data: naiveRecommendationFallback(notApplied, limit)
                });
            }
            throw err;
        }

        if (topScores.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        // Re-fetch the top N with the full includes used everywhere else.
        const topIds = topScores.map((s) => s.task_id);
        const fullTasks = await Task.findAll({
            where: { id: { [Op.in]: topIds } },
            include: taskIncludes()
        });
        const taskById = new Map(fullTasks.map((t) => [String(t.id), t]));

        const merged = topScores
            .map((s) => {
                const t = taskById.get(String(s.task_id));
                if (!t) return null;
                const json = t.toJSON();
                if (json.company) json.companyId = json.company;
                json.matchScore = s.score;
                json.matchReasons = Array.isArray(s.reasons) ? s.reasons : [];
                return json;
            })
            .filter(Boolean);

        res.status(200).json({ success: true, data: merged });
    } catch (error) {
        next(error);
    }
};

// @desc    Force recomputation of match scores for every application of a task
// @route   POST /api/tasks/:id/recompute-matches
// @access  Private (company)
exports.recomputeMatchesForTask = async (req, res, next) => {
    try {
        const company = await Company.findOne({ where: { userId: req.user.id } });
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const task = await Task.findByPk(req.params.id, {
            include: [{ model: TaskSkill, as: 'skillsRequired' }]
        });
        if (!task) return next(new ErrorResponse('Task not found', 404));
        if (String(task.companyId) !== String(company.id)) {
            return next(new ErrorResponse('Not authorized to recompute matches for this task', 403));
        }

        const applications = await Application.findAll({
            where: { taskId: task.id },
            include: [{
                model: Student,
                as: 'student',
                include: [
                    { model: StudentSkill, as: 'skills' },
                    { model: StudentExperience, as: 'experience' },
                    { model: StudentEducation, as: 'education' }
                ]
            }]
        });

        if (applications.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No applications to score',
                data: { updated: 0, total: 0 }
            });
        }

        try {
            const ranking = await aiService.rankCandidates(
                aiService.mapTaskToDto(task),
                applications
                    .filter((a) => a.student)
                    .map((a) => aiService.mapStudentToDto(a.student))
            );
            const scoreByStudentId = new Map(
                ranking.map((r) => [String(r.student_id), r.score])
            );

            let updated = 0;
            await Promise.all(applications.map(async (app) => {
                const score = scoreByStudentId.get(String(app.studentId));
                if (typeof score === 'number') {
                    await Application.update(
                        { matchScore: score },
                        { where: { id: app.id } }
                    );
                    updated += 1;
                }
            }));

            res.status(200).json({
                success: true,
                message: 'Match scores recomputed',
                data: { updated, total: applications.length }
            });
        } catch (err) {
            if (err instanceof AIServiceUnavailableError) {
                return next(new ErrorResponse('AI service unavailable, please retry shortly', 503));
            }
            throw err;
        }
    } catch (error) {
        next(error);
    }
};
