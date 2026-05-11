const { Op } = require('sequelize');
const {
    sequelize,
    Task,
    TaskSkill,
    TaskAttachment,
    Company
} = require('../models');
const ErrorResponse = require('../utils/errorResponse');

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

// @desc    Get all public tasks with filtering and pagination
exports.getTasks = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 12,
            skills,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

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

        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        const { rows, count } = await Task.findAndCountAll({
            where,
            include,
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
                tasks: rows.map((t) => {
                    const json = t.toJSON();
                    if (json.company) json.companyId = json.company;
                    return json;
                }),
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

// @desc    Get recommended tasks
exports.getRecommendedTasks = async (req, res, next) => {
    try {
        const { limit = 10 } = req.query;

        const tasks = await Task.findAll({
            where: {
                status: 'active',
                isPublic: true,
                applicationDeadline: { [Op.gt]: new Date() }
            },
            include: taskIncludes(),
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit, 10),
            subQuery: false
        });

        res.status(200).json({
            success: true,
            data: tasks.map((t) => {
                const json = t.toJSON();
                if (json.company) json.companyId = json.company;
                return json;
            })
        });
    } catch (error) {
        next(error);
    }
};
