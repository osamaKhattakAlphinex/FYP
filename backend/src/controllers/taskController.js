const Task = require('../models/Task');
const Company = require('../models/Company');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all public tasks with filtering and pagination
// @route   GET /api/tasks
// @access  Public
exports.getTasks = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 12,
            category,
            workType,
            experienceLevel,
            budget,
            search,
            skills,
            location,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = {
            status: 'active',
            isPublic: true,
            applicationDeadline: {
                $gt: new Date()
            }
        };

        // Category filter
        if (category && category !== 'all') {
            filter.category = category;
        }

        // Work type filter
        if (workType && workType !== 'all') {
            filter.workType = workType;
        }

        // Experience level filter
        if (experienceLevel && experienceLevel !== 'all') {
            filter.experienceLevel = experienceLevel;
        }

        // Budget filter
        if (budget && budget !== 'all') {
            switch (budget) {
                case 'unpaid':
                    filter['budget.type'] = 'unpaid';
                    break;
                case 'under-500':
                    filter['budget.amount.max'] = {
                        $lt: 500
                    };
                    break;
                case '500-1000':
                    filter['budget.amount.min'] = {
                        $gte: 500
                    };
                    filter['budget.amount.max'] = {
                        $lte: 1000
                    };
                    break;
                case 'over-1000':
                    filter['budget.amount.min'] = {
                        $gt: 1000
                    };
                    break;
            }
        }

        // Location filter
        if (location && location !== 'all') {
            if (location === 'remote') {
                filter.workType = 'remote';
            } else {
                filter['location.country'] = new RegExp(location, 'i');
            }
        }

        // Skills filter
        if (skills) {
            const skillsArray = skills.split(',').map(s => s.trim());
            filter['skillsRequired.name'] = {
                $in: skillsArray
            };
        }

        // Search filter
        if (search) {
            filter.$or = [{
                title: {
                    $regex: search,
                    $options: 'i'
                }
            },
            {
                description: {
                    $regex: search,
                    $options: 'i'
                }
            },
            {
                'skillsRequired.name': {
                    $regex: search,
                    $options: 'i'
                }
            },
            {
                tags: {
                    $regex: search,
                    $options: 'i'
                }
            }
            ];
        }

        // Sort options
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const tasks = await Task.find(filter)
            .populate('companyId', 'companyName logo industry location isVerified')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get total count for pagination
        const total = await Task.countDocuments(filter);

        // Calculate pagination info
        const totalPages = Math.ceil(total / parseInt(limit));
        const hasNextPage = parseInt(page) < totalPages;
        const hasPrevPage = parseInt(page) > 1;

        res.status(200).json({
            success: true,
            data: {
                tasks,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalTasks: total,
                    hasNextPage,
                    hasPrevPage,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
// @access  Public
exports.getTask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('companyId', 'companyName logo industry location isVerified description website socialLinks')
            .lean();

        if (!task) {
            return next(new ErrorResponse('Task not found', 404));
        }

        // Check if task is accessible
        if (!task.isPublic || task.status !== 'active') {
            return next(new ErrorResponse('Task not available', 403));
        }

        res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Track unique view for a task
// @route   POST /api/tasks/:id/view
// @access  Private (Authenticated users only)
exports.trackTaskView = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return next(new ErrorResponse('Task not found', 404));
        }

        // Track unique view
        const isNewView = await task.trackUniqueView(req.user.id);

        res.status(200).json({
            success: true,
            data: {
                views: task.views,
                isNewView
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private (Company only)
exports.createTask = async (req, res, next) => {
    try {
        // Get company from authenticated user
        const company = await Company.findOne({
            userId: req.user.id
        });
        if (!company) {
            return next(new ErrorResponse('Company profile not found', 404));
        }

        // Add company ID to task data
        req.body.companyId = company._id;

        // Create task
        const task = await Task.create(req.body);

        // Populate company data
        await task.populate('companyId', 'companyName logo industry location isVerified');

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: task
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private (Company owner only)
exports.updateTask = async (req, res, next) => {
    try {
        let task = await Task.findById(req.params.id);

        if (!task) {
            return next(new ErrorResponse('Task not found', 404));
        }

        // Get company from authenticated user
        const company = await Company.findOne({
            userId: req.user.id
        });
        if (!company) {
            return next(new ErrorResponse('Company profile not found', 404));
        }

        // Check if user owns this task
        if (task.companyId.toString() !== company._id.toString()) {
            return next(new ErrorResponse('Not authorized to update this task', 403));
        }

        // Update task
        task = await Task.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).populate('companyId', 'companyName logo industry location isVerified');

        res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            data: task
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (Company owner only)
exports.deleteTask = async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return next(new ErrorResponse('Task not found', 404));
        }

        // Get company from authenticated user
        const company = await Company.findOne({
            userId: req.user.id
        });
        if (!company) {
            return next(new ErrorResponse('Company profile not found', 404));
        }

        // Check if user owns this task
        if (task.companyId.toString() !== company._id.toString()) {
            return next(new ErrorResponse('Not authorized to delete this task', 403));
        }

        await Task.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get company's tasks
// @route   GET /api/tasks/company/my-tasks
// @access  Private (Company only)
exports.getMyTasks = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 10,
            status = 'all',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Get company from authenticated user
        const company = await Company.findOne({
            userId: req.user.id
        });
        if (!company) {
            return next(new ErrorResponse('Company profile not found', 404));
        }

        // Build filter
        const filter = {
            companyId: company._id
        };

        if (status !== 'all') {
            filter.status = status;
        }

        // Sort options
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const tasks = await Task.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get total count
        const total = await Task.countDocuments(filter);

        // Calculate pagination info
        const totalPages = Math.ceil(total / parseInt(limit));

        res.status(200).json({
            success: true,
            data: {
                tasks,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalTasks: total,
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get task statistics
// @route   GET /api/tasks/stats
// @access  Public
exports.getTaskStats = async (req, res, next) => {
    try {
        const stats = await Promise.all([
            // Total active tasks
            Task.countDocuments({
                status: 'active',
                isPublic: true
            }),

            // Tasks by category
            Task.aggregate([{
                $match: {
                    status: 'active',
                    isPublic: true
                }
            },
            {
                $group: {
                    _id: '$category',
                    count: {
                        $sum: 1
                    }
                }
            },
            {
                $sort: {
                    count: -1
                }
            }
            ]),

            // Tasks by work type
            Task.aggregate([{
                $match: {
                    status: 'active',
                    isPublic: true
                }
            },
            {
                $group: {
                    _id: '$workType',
                    count: {
                        $sum: 1
                    }
                }
            }
            ]),

            // Average budget
            Task.aggregate([{
                $match: {
                    status: 'active',
                    isPublic: true,
                    'budget.type': {
                        $ne: 'unpaid'
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avgMin: {
                        $avg: '$budget.amount.min'
                    },
                    avgMax: {
                        $avg: '$budget.amount.max'
                    }
                }
            }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalActiveTasks: stats[0],
                tasksByCategory: stats[1],
                tasksByWorkType: stats[2],
                averageBudget: stats[3][0] || {
                    avgMin: 0,
                    avgMax: 0
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Search tasks with advanced filters
// @route   POST /api/tasks/search
// @access  Public
exports.searchTasks = async (req, res, next) => {
    try {
        const {
            query,
            filters = {},
            page = 1,
            limit = 12,
            sortBy = 'relevance'
        } = req.body;

        let searchFilter = {
            status: 'active',
            isPublic: true,
            applicationDeadline: {
                $gt: new Date()
            }
        };

        // Text search
        if (query) {
            searchFilter.$text = {
                $search: query
            };
        }

        // Apply additional filters
        Object.assign(searchFilter, filters);

        let sortOptions = {};

        if (sortBy === 'relevance' && query) {
            sortOptions = {
                score: {
                    $meta: 'textScore'
                }
            };
        } else {
            sortOptions[sortBy] = -1;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const tasks = await Task.find(searchFilter,
            query ? {
                score: {
                    $meta: 'textScore'
                }
            } : {}
        )
            .populate('companyId', 'companyName logo industry location isVerified')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Task.countDocuments(searchFilter);

        res.status(200).json({
            success: true,
            data: {
                tasks,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    totalTasks: total,
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get recommended tasks for student
// @route   GET /api/tasks/recommendations
// @access  Private (Student only)
exports.getRecommendedTasks = async (req, res, next) => {
    try {
        const {
            limit = 10
        } = req.query;

        // This would typically use AI/ML for recommendations
        // For now, we'll use a simple skill-based matching

        const tasks = await Task.find({
            status: 'active',
            isPublic: true,
            applicationDeadline: {
                $gt: new Date()
            }
        })
            .populate('companyId', 'companyName logo industry location isVerified')
            .sort({
                createdAt: -1
            })
            .limit(parseInt(limit))
            .lean();

        res.status(200).json({
            success: true,
            data: tasks
        });
    } catch (error) {
        next(error);
    }
};