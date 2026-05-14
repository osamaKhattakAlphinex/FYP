const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

const CATEGORIES = [
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
];

class Task extends Model {
    getTimeRemaining() {
        if (!this.applicationDeadline) return null;
        const now = new Date();
        const deadline = new Date(this.applicationDeadline);
        const diff = deadline - now;
        if (diff <= 0) return { expired: true };
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return { days, hours, expired: false };
    }

    getBudgetDisplay() {
        if (!this.budgetType || this.budgetType === 'unpaid') return 'Unpaid';
        const currency = this.budgetCurrency || 'USD';
        const min = this.budgetAmountMin;
        const max = this.budgetAmountMax;
        if (this.budgetType === 'fixed') {
            if (min === max) return `${currency} ${min}`;
            return `${currency} ${min} - ${max}`;
        }
        if (this.budgetType === 'hourly') {
            if (min === max) return `${currency} ${min}/hr`;
            return `${currency} ${min} - ${max}/hr`;
        }
        return 'Negotiable';
    }

    canApply() {
        const now = new Date();
        return this.status === 'active'
            && new Date(this.applicationDeadline) > now
            && this.applicationCount < this.maxApplications;
    }

    getMatchingScore(studentSkills) {
        if (!studentSkills || !Array.isArray(this.skillsRequired) || this.skillsRequired.length === 0) {
            return 0;
        }
        const required = this.skillsRequired.map((s) => (s.name || '').toLowerCase());
        const have = studentSkills.map((s) => (s.name || '').toLowerCase());
        const matches = required.filter((s) => have.includes(s));
        return Math.round((matches.length / required.length) * 100);
    }

    async trackUniqueView(userId) {
        const TaskUniqueViewer = sequelize.models.TaskUniqueViewer;
        const [, created] = await TaskUniqueViewer.findOrCreate({
            where: { taskId: this.id, userId },
            defaults: { viewedAt: new Date() }
        });

        if (created) {
            const count = await TaskUniqueViewer.count({ where: { taskId: this.id } });
            this.views = count;
            await this.save();
            return true;
        }
        return false;
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;

        ['deliverables', 'benefits', 'tags', 'searchKeywords', 'requirements'].forEach((k) => {
            if (typeof values[k] === 'string') {
                try { values[k] = JSON.parse(values[k]); } catch { values[k] = []; }
            }
            if (!Array.isArray(values[k])) values[k] = [];
        });

        values.duration = {
            value: values.durationValue,
            unit: values.durationUnit
        };

        values.budget = {
            type: values.budgetType,
            amount: {
                min: values.budgetAmountMin != null ? Number(values.budgetAmountMin) : undefined,
                max: values.budgetAmountMax != null ? Number(values.budgetAmountMax) : undefined
            },
            currency: values.budgetCurrency || 'USD'
        };

        values.location = {
            city: values.locationCity || undefined,
            state: values.locationState || undefined,
            country: values.locationCountry || undefined,
            timezone: values.locationTimezone || undefined
        };

        if (Array.isArray(values.skillsRequired)) {
            values.skillsRequired = values.skillsRequired.map((s) => ({
                ...(s.toJSON ? s.toJSON() : s),
                _id: (s.toJSON ? s.toJSON() : s).id
            }));
        }

        if (Array.isArray(values.attachments)) {
            values.attachments = values.attachments.map((a) => ({
                ...(a.toJSON ? a.toJSON() : a),
                _id: (a.toJSON ? a.toJSON() : a).id
            }));
        }

        if (Array.isArray(values.uniqueViewers)) {
            values.uniqueViewers = values.uniqueViewers.map((v) => ({
                ...(v.toJSON ? v.toJSON() : v),
                _id: (v.toJSON ? v.toJSON() : v).id
            }));
        }

        values.timeRemaining = this.getTimeRemaining();
        values.budgetDisplay = this.getBudgetDisplay();

        if (values.company && typeof values.company === 'object') {
            values.company = values.company.toJSON ? values.company.toJSON() : values.company;
        }

        [
            'durationValue', 'durationUnit',
            'budgetType', 'budgetAmountMin', 'budgetAmountMax', 'budgetCurrency',
            'locationCity', 'locationState', 'locationCountry', 'locationTimezone'
        ].forEach((k) => delete values[k]);

        return values;
    }
}

Task.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        title: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Task title is required' },
                len: { args: [1, 100], msg: 'Title cannot exceed 100 characters' }
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Task description is required' },
                len: { args: [1, 5000], msg: 'Description cannot exceed 5000 characters' }
            }
        },
        category: {
            type: DataTypes.ENUM(...CATEGORIES),
            allowNull: false
        },
        subcategory: { type: DataTypes.STRING(150), allowNull: true },
        companyId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: 'companies', key: 'id' },
            onDelete: 'CASCADE'
        },
        type: {
            type: DataTypes.ENUM('internship', 'project', 'freelance'),
            allowNull: false,
            defaultValue: 'internship'
        },

        durationValue: { type: DataTypes.INTEGER, allowNull: false },
        durationUnit: {
            type: DataTypes.ENUM('days', 'weeks', 'months'),
            allowNull: false
        },

        workType: {
            type: DataTypes.ENUM('remote', 'onsite', 'hybrid'),
            allowNull: false
        },
        experienceLevel: {
            type: DataTypes.ENUM('entry', 'intermediate', 'expert'),
            allowNull: false
        },

        requirements: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },

        budgetType: {
            type: DataTypes.ENUM('fixed', 'hourly', 'unpaid'),
            allowNull: false
        },
        budgetAmountMin: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
        budgetAmountMax: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
        budgetCurrency: { type: DataTypes.STRING(10), defaultValue: 'USD' },

        applicationDeadline: { type: DataTypes.DATE, allowNull: false },
        startDate: { type: DataTypes.DATE, allowNull: false },
        endDate: { type: DataTypes.DATE, allowNull: true },

        status: {
            type: DataTypes.ENUM('draft', 'active', 'paused', 'closed', 'completed'),
            defaultValue: 'draft'
        },
        isPublic: { type: DataTypes.BOOLEAN, defaultValue: true },
        isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false },

        maxApplications: { type: DataTypes.INTEGER, defaultValue: 50 },
        applicationCount: { type: DataTypes.INTEGER, defaultValue: 0 },

        deliverables: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
        benefits: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },

        locationCity: { type: DataTypes.STRING(100), allowNull: true },
        locationState: { type: DataTypes.STRING(100), allowNull: true },
        locationCountry: { type: DataTypes.STRING(100), allowNull: true },
        locationTimezone: { type: DataTypes.STRING(50), allowNull: true },

        tags: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
        searchKeywords: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },

        views: { type: DataTypes.INTEGER, defaultValue: 0 },
        saves: { type: DataTypes.INTEGER, defaultValue: 0 },

        publishedAt: { type: DataTypes.DATE, allowNull: true },
        closedAt: { type: DataTypes.DATE, allowNull: true }
    },
    {
        sequelize,
        modelName: 'Task',
        tableName: 'tasks',
        timestamps: true,
        indexes: [
            { fields: ['companyId', 'status'] },
            { fields: ['category', 'status'] },
            { fields: ['workType', 'experienceLevel'] },
            { fields: ['applicationDeadline'] },
            { fields: ['createdAt'] },
            { fields: ['views'] },
            { type: 'FULLTEXT', fields: ['title', 'description'] }
        ],
        hooks: {
            beforeSave: (task) => {
                if (task.changed('status')) {
                    if (task.status === 'active' && !task.publishedAt) {
                        task.publishedAt = new Date();
                    }
                    if (['closed', 'completed'].includes(task.status) && !task.closedAt) {
                        task.closedAt = new Date();
                    }
                }

                if (task.changed('title') || task.changed('description')) {
                    const keywords = [];
                    if (task.title) {
                        keywords.push(...task.title.toLowerCase().split(/\s+/));
                    }
                    if (task.description) {
                        const descWords = task.description.toLowerCase()
                            .replace(/[^\w\s]/g, ' ')
                            .split(/\s+/)
                            .slice(0, 100);
                        keywords.push(...descWords);
                    }
                    task.searchKeywords = [...new Set(keywords)].filter((w) => w.length > 2);
                }
            }
        }
    }
);

Task.CATEGORIES = CATEGORIES;

Task.getActiveTasksCount = function (companyId) {
    return Task.count({
        where: {
            companyId,
            status: ['active', 'paused']
        }
    });
};

Task.getPopularCategories = async function () {
    return Task.findAll({
        attributes: [
            'category',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: { status: 'active' },
        group: ['category'],
        order: [[sequelize.literal('count'), 'DESC']],
        limit: 10,
        raw: true
    });
};

module.exports = Task;
