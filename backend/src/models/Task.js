const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    // Basic Information
    title: {
        type: String,
        required: [true, 'Task title is required'],
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Task description is required'],
        maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: [
            'Web Development',
            'Mobile Development',
            'UI/UX Design',
            'Data Science',
            'Machine Learning',
            'Digital Marketing',
            'Content Writing',
            'Graphic Design',
            'Video Editing',
            'Business Analysis',
            'Quality Assurance',
            'DevOps',
            'Cybersecurity',
            'Other'
        ]
    },
    subcategory: {
        type: String,
        trim: true
    },

    // Company Information
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },

    // Task Details
    type: {
        type: String,
        required: true,
        enum: ['internship', 'project', 'freelance'],
        default: 'internship'
    },
    duration: {
        value: {
            type: Number,
            required: true
        },
        unit: {
            type: String,
            required: true,
            enum: ['days', 'weeks', 'months']
        }
    },
    workType: {
        type: String,
        required: true,
        enum: ['remote', 'onsite', 'hybrid']
    },
    experienceLevel: {
        type: String,
        required: true,
        enum: ['entry', 'intermediate', 'expert']
    },

    // Skills and Requirements
    skillsRequired: [{
        name: {
            type: String,
            required: true
        },
        level: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'intermediate'
        },
        required: {
            type: Boolean,
            default: true
        }
    }],
    requirements: [String],

    // Compensation
    budget: {
        type: {
            type: String,
            enum: ['fixed', 'hourly', 'unpaid'],
            required: true
        },
        amount: {
            min: Number,
            max: Number
        },
        currency: {
            type: String,
            default: 'USD'
        }
    },

    // Timeline
    applicationDeadline: {
        type: Date,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: Date,

    // Status and Visibility
    status: {
        type: String,
        enum: ['draft', 'active', 'paused', 'closed', 'completed'],
        default: 'draft'
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },

    // Application Settings
    maxApplications: {
        type: Number,
        default: 50
    },
    applicationCount: {
        type: Number,
        default: 0
    },

    // Additional Information
    deliverables: [String],
    benefits: [String],

    // Location (for onsite/hybrid)
    location: {
        city: String,
        state: String,
        country: String,
        timezone: String
    },

    // Attachments
    attachments: [{
        name: String,
        url: String,
        type: String
    }],

    // SEO and Search
    tags: [String],
    searchKeywords: [String],

    // Analytics
    views: {
        type: Number,
        default: 0
    },
    uniqueViewers: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        viewedAt: {
            type: Date,
            default: Date.now
        }
    }],
    saves: {
        type: Number,
        default: 0
    },

    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    publishedAt: Date,
    closedAt: Date
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    },
    toObject: {
        virtuals: true
    }
});

// Indexes for better query performance
taskSchema.index({
    companyId: 1,
    status: 1
});
taskSchema.index({
    category: 1,
    status: 1
});
taskSchema.index({
    'skillsRequired.name': 1
});
taskSchema.index({
    workType: 1,
    experienceLevel: 1
});
taskSchema.index({
    applicationDeadline: 1
});
taskSchema.index({
    createdAt: -1
});
taskSchema.index({
    views: -1
});

// Text search index
taskSchema.index({
    title: 'text',
    description: 'text',
    'skillsRequired.name': 'text',
    tags: 'text'
});

// Virtual for company details
taskSchema.virtual('company', {
    ref: 'Company',
    localField: 'companyId',
    foreignField: '_id',
    justOne: true
});

// Virtual for applications
taskSchema.virtual('applications', {
    ref: 'Application',
    localField: '_id',
    foreignField: 'taskId'
});

// Virtual for time remaining
taskSchema.virtual('timeRemaining').get(function () {
    if (!this.applicationDeadline) return null;

    const now = new Date();
    const deadline = new Date(this.applicationDeadline);
    const diff = deadline - now;

    if (diff <= 0) return {
        expired: true
    };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return {
        days,
        hours,
        expired: false
    };
});

// Virtual for budget display
taskSchema.virtual('budgetDisplay').get(function () {
    if (!this.budget || this.budget.type === 'unpaid') {
        return 'Unpaid';
    }

    const {
        type,
        amount,
        currency
    } = this.budget;

    if (type === 'fixed') {
        if (amount.min === amount.max) {
            return `${currency} ${amount.min}`;
        }
        return `${currency} ${amount.min} - ${amount.max}`;
    }

    if (type === 'hourly') {
        if (amount.min === amount.max) {
            return `${currency} ${amount.min}/hr`;
        }
        return `${currency} ${amount.min} - ${amount.max}/hr`;
    }

    return 'Negotiable';
});

// Pre-save middleware
taskSchema.pre('save', function (next) {
    this.updatedAt = Date.now();

    // Set publishedAt when status changes to active
    if (this.isModified('status') && this.status === 'active' && !this.publishedAt) {
        this.publishedAt = Date.now();
    }

    // Set closedAt when status changes to closed/completed
    if (this.isModified('status') && ['closed', 'completed'].includes(this.status) && !this.closedAt) {
        this.closedAt = Date.now();
    }

    // Generate search keywords from title and description
    if (this.isModified('title') || this.isModified('description')) {
        const keywords = [];

        // Extract keywords from title
        const titleWords = this.title.toLowerCase().split(/\s+/);
        keywords.push(...titleWords);

        // Extract keywords from description (first 100 words)
        const descWords = this.description.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .slice(0, 100);
        keywords.push(...descWords);

        // Remove duplicates and short words
        this.searchKeywords = [...new Set(keywords)]
            .filter(word => word.length > 2);
    }

    next();
});

// Static methods
taskSchema.statics.getActiveTasksCount = function (companyId) {
    return this.countDocuments({
        companyId,
        status: {
            $in: ['active', 'paused']
        }
    });
};

taskSchema.statics.getPopularCategories = function () {
    return this.aggregate([{
        $match: {
            status: 'active'
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
    },
    {
        $limit: 10
    }
    ]);
};

// Instance methods
taskSchema.methods.incrementViews = function () {
    this.views += 1;
    return this.save();
};

taskSchema.methods.trackUniqueView = async function (userId) {
    // Check if user has already viewed this task
    const hasViewed = this.uniqueViewers.some(
        viewer => viewer.userId && viewer.userId.toString() === userId.toString()
    );

    if (!hasViewed) {
        this.uniqueViewers.push({
            userId,
            viewedAt: new Date()
        });
        this.views = this.uniqueViewers.length;
        await this.save();
        return true; // New view
    }

    return false; // Already viewed
};

taskSchema.methods.canApply = function () {
    const now = new Date();
    return this.status === 'active' &&
        this.applicationDeadline > now &&
        this.applicationCount < this.maxApplications;
};

taskSchema.methods.getMatchingScore = function (studentSkills) {
    if (!studentSkills || !this.skillsRequired) return 0;

    const requiredSkills = this.skillsRequired.map(s => s.name.toLowerCase());
    const studentSkillNames = studentSkills.map(s => s.name.toLowerCase());

    const matches = requiredSkills.filter(skill =>
        studentSkillNames.includes(skill)
    );

    return Math.round((matches.length / requiredSkills.length) * 100);
};

module.exports = mongoose.model('Task', taskSchema);