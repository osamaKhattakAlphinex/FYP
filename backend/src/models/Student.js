const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Student extends Model {
    calculateProfileCompletion() {
        let completion = 0;
        const weights = {
            basicInfo: 20,
            education: 15,
            skills: 15,
            experience: 15,
            projects: 15,
            bio: 10,
            resume: 10
        };

        const hasLocation = this.locationCity || this.locationCountry;
        if (this.firstName && this.lastName && hasLocation) completion += weights.basicInfo;

        if (this.education && this.education.length > 0) completion += weights.education;
        if (this.skills && this.skills.length >= 3) completion += weights.skills;
        if (this.experience && this.experience.length > 0) completion += weights.experience;
        if (this.projects && this.projects.length > 0) completion += weights.projects;
        if (this.bio) completion += weights.bio;
        if (this.resumeUrl) completion += weights.resume;

        this.profileCompletion = completion;
        return completion;
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;

        values.location = {
            city: values.locationCity || undefined,
            state: values.locationState || undefined,
            country: values.locationCountry || undefined
        };

        values.socialLinks = {
            linkedin: values.socialLinkedin || undefined,
            github: values.socialGithub || undefined,
            portfolio: values.socialPortfolio || undefined,
            twitter: values.socialTwitter || undefined
        };

        values.resume = {
            url: values.resumeUrl || null,
            uploadedAt: values.resumeUploadedAt || null
        };

        values.preferences = {
            jobTypes: values.preferenceJobTypes || [],
            industries: values.preferenceIndustries || [],
            locations: values.preferenceLocations || [],
            remoteWork: values.preferenceRemoteWork !== false
        };

        values.stats = {
            tasksCompleted: values.statTasksCompleted || 0,
            tasksInProgress: values.statTasksInProgress || 0,
            certificatesEarned: values.statCertificatesEarned || 0,
            averageRating: values.statAverageRating ? Number(values.statAverageRating) : 0,
            totalRatings: values.statTotalRatings || 0
        };

        if (Array.isArray(values.education)) {
            values.education = values.education.map((e) => ({ ...e.toJSON ? e.toJSON() : e, _id: (e.toJSON ? e.toJSON() : e).id }));
        }
        if (Array.isArray(values.skills)) {
            values.skills = values.skills.map((s) => ({ ...s.toJSON ? s.toJSON() : s, _id: (s.toJSON ? s.toJSON() : s).id }));
        }
        if (Array.isArray(values.experience)) {
            values.experience = values.experience.map((e) => ({ ...e.toJSON ? e.toJSON() : e, _id: (e.toJSON ? e.toJSON() : e).id }));
        }
        if (Array.isArray(values.projects)) {
            values.projects = values.projects.map((p) => ({ ...p.toJSON ? p.toJSON() : p, _id: (p.toJSON ? p.toJSON() : p).id }));
        }
        if (Array.isArray(values.certificates)) {
            values.certificates = values.certificates.map((c) => ({ ...c.toJSON ? c.toJSON() : c, _id: (c.toJSON ? c.toJSON() : c).id }));
        }

        [
            'locationCity', 'locationState', 'locationCountry',
            'socialLinkedin', 'socialGithub', 'socialPortfolio', 'socialTwitter',
            'resumeUrl', 'resumeUploadedAt',
            'preferenceJobTypes', 'preferenceIndustries', 'preferenceLocations', 'preferenceRemoteWork',
            'statTasksCompleted', 'statTasksInProgress', 'statCertificatesEarned', 'statAverageRating', 'statTotalRatings'
        ].forEach((k) => delete values[k]);

        return values;
    }
}

Student.init(
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            autoIncrement: true,
            primaryKey: true
        },
        userId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            unique: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE'
        },
        firstName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: { notEmpty: { msg: 'Please provide first name' } }
        },
        lastName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: { notEmpty: { msg: 'Please provide last name' } }
        },
        profilePicture: { type: DataTypes.STRING(500), allowNull: true, defaultValue: null },
        headline: {
            type: DataTypes.STRING(100),
            allowNull: true,
            validate: { len: { args: [0, 100], msg: 'Headline cannot exceed 100 characters' } }
        },
        phone: { type: DataTypes.STRING(50), allowNull: true },
        dateOfBirth: { type: DataTypes.DATEONLY, allowNull: true },
        bio: {
            type: DataTypes.STRING(500),
            allowNull: true,
            validate: { len: { args: [0, 500], msg: 'Bio cannot exceed 500 characters' } }
        },

        locationCity: { type: DataTypes.STRING(100), allowNull: true },
        locationState: { type: DataTypes.STRING(100), allowNull: true },
        locationCountry: { type: DataTypes.STRING(100), allowNull: true },

        socialLinkedin: { type: DataTypes.STRING(500), allowNull: true },
        socialGithub: { type: DataTypes.STRING(500), allowNull: true },
        socialPortfolio: { type: DataTypes.STRING(500), allowNull: true },
        socialTwitter: { type: DataTypes.STRING(500), allowNull: true },

        resumeUrl: { type: DataTypes.STRING(500), allowNull: true },
        resumeUploadedAt: { type: DataTypes.DATE, allowNull: true },

        preferenceJobTypes: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
        preferenceIndustries: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
        preferenceLocations: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
        preferenceRemoteWork: { type: DataTypes.BOOLEAN, defaultValue: true },

        statTasksCompleted: { type: DataTypes.INTEGER, defaultValue: 0 },
        statTasksInProgress: { type: DataTypes.INTEGER, defaultValue: 0 },
        statCertificatesEarned: { type: DataTypes.INTEGER, defaultValue: 0 },
        statAverageRating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 },
        statTotalRatings: { type: DataTypes.INTEGER, defaultValue: 0 },

        profileCompletion: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            validate: { min: 0, max: 100 }
        },
        isProfilePublic: { type: DataTypes.BOOLEAN, defaultValue: true }
    },
    {
        sequelize,
        modelName: 'Student',
        tableName: 'students',
        timestamps: true
    }
);

module.exports = Student;
