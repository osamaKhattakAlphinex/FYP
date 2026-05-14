const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Company extends Model {
    calculateProfileCompletion() {
        let completion = 0;
        const weights = {
            basicInfo: 25,
            description: 15,
            location: 15,
            contactInfo: 15,
            culture: 10,
            team: 10,
            logo: 10
        };

        if (this.companyName && this.industry && this.companySize) completion += weights.basicInfo;
        if (this.description) completion += weights.description;
        if (this.locationCity && this.locationCountry) completion += weights.location;
        if (this.contactPhone && this.contactEmail) completion += weights.contactInfo;
        if (Array.isArray(this.cultureValues) && this.cultureValues.length > 0) completion += weights.culture;
        if (Array.isArray(this.team) && this.team.length > 0) completion += weights.team;
        if (this.logo) completion += weights.logo;

        this.profileCompletion = completion;
        return completion;
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;

        ['cultureValues', 'cultureBenefits'].forEach((k) => {
            if (typeof values[k] === 'string') {
                try { values[k] = JSON.parse(values[k]); } catch { values[k] = []; }
            }
            if (!Array.isArray(values[k])) values[k] = [];
        });

        values.location = {
            address: values.locationAddress || undefined,
            city: values.locationCity || undefined,
            state: values.locationState || undefined,
            country: values.locationCountry || undefined,
            zipCode: values.locationZipCode || undefined
        };

        values.contactInfo = {
            phone: values.contactPhone || undefined,
            email: values.contactEmail || undefined,
            contactPerson: {
                name: values.contactPersonName || undefined,
                designation: values.contactPersonDesignation || undefined,
                email: values.contactPersonEmail || undefined,
                phone: values.contactPersonPhone || undefined
            }
        };

        values.socialLinks = {
            linkedin: values.socialLinkedin || undefined,
            twitter: values.socialTwitter || undefined,
            facebook: values.socialFacebook || undefined,
            instagram: values.socialInstagram || undefined
        };

        values.culture = {
            values: values.cultureValues || [],
            benefits: values.cultureBenefits || [],
            workEnvironment: values.cultureWorkEnvironment || undefined
        };

        values.verification = {
            isVerified: values.verificationIsVerified || false,
            verifiedAt: values.verificationVerifiedAt || null,
            documents: Array.isArray(values.verificationDocuments)
                ? values.verificationDocuments.map((d) => ({
                    ...(d.toJSON ? d.toJSON() : d),
                    _id: (d.toJSON ? d.toJSON() : d).id
                }))
                : []
        };

        values.stats = {
            activeTasks: values.statActiveTasks || 0,
            completedTasks: values.statCompletedTasks || 0,
            totalApplications: values.statTotalApplications || 0,
            hiredCandidates: values.statHiredCandidates || 0,
            averageRating: values.statAverageRating ? Number(values.statAverageRating) : 0,
            totalRatings: values.statTotalRatings || 0
        };

        if (Array.isArray(values.team)) {
            values.team = values.team.map((m) => ({ ...(m.toJSON ? m.toJSON() : m), _id: (m.toJSON ? m.toJSON() : m).id }));
        }

        [
            'locationAddress', 'locationCity', 'locationState', 'locationCountry', 'locationZipCode',
            'contactPhone', 'contactEmail',
            'contactPersonName', 'contactPersonDesignation', 'contactPersonEmail', 'contactPersonPhone',
            'socialLinkedin', 'socialTwitter', 'socialFacebook', 'socialInstagram',
            'cultureValues', 'cultureBenefits', 'cultureWorkEnvironment',
            'verificationIsVerified', 'verificationVerifiedAt', 'verificationDocuments',
            'statActiveTasks', 'statCompletedTasks', 'statTotalApplications', 'statHiredCandidates',
            'statAverageRating', 'statTotalRatings'
        ].forEach((k) => delete values[k]);

        return values;
    }
}

Company.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        userId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            unique: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'CASCADE'
        },
        companyName: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: { notEmpty: { msg: 'Please provide company name' } }
        },
        companySize: {
            type: DataTypes.ENUM('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'),
            allowNull: true
        },
        industry: {
            type: DataTypes.STRING(150),
            allowNull: false,
            validate: { notEmpty: { msg: 'Please provide industry' } }
        },
        foundedYear: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: { min: 1800, max: new Date().getFullYear() }
        },
        website: { type: DataTypes.STRING(500), allowNull: true },
        description: {
            type: DataTypes.STRING(1000),
            allowNull: true,
            validate: { len: { args: [0, 1000], msg: 'Description cannot exceed 1000 characters' } }
        },
        logo: { type: DataTypes.STRING(500), allowNull: true },
        coverImage: { type: DataTypes.STRING(500), allowNull: true },

        locationAddress: { type: DataTypes.STRING(255), allowNull: true },
        locationCity: { type: DataTypes.STRING(100), allowNull: true },
        locationState: { type: DataTypes.STRING(100), allowNull: true },
        locationCountry: { type: DataTypes.STRING(100), allowNull: true },
        locationZipCode: { type: DataTypes.STRING(30), allowNull: true },

        contactPhone: { type: DataTypes.STRING(50), allowNull: true },
        contactEmail: { type: DataTypes.STRING(191), allowNull: true },
        contactPersonName: { type: DataTypes.STRING(150), allowNull: true },
        contactPersonDesignation: { type: DataTypes.STRING(150), allowNull: true },
        contactPersonEmail: { type: DataTypes.STRING(191), allowNull: true },
        contactPersonPhone: { type: DataTypes.STRING(50), allowNull: true },

        socialLinkedin: { type: DataTypes.STRING(500), allowNull: true },
        socialTwitter: { type: DataTypes.STRING(500), allowNull: true },
        socialFacebook: { type: DataTypes.STRING(500), allowNull: true },
        socialInstagram: { type: DataTypes.STRING(500), allowNull: true },

        cultureValues: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
        cultureBenefits: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
        cultureWorkEnvironment: { type: DataTypes.STRING(500), allowNull: true },

        verificationIsVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
        verificationVerifiedAt: { type: DataTypes.DATE, allowNull: true },

        statActiveTasks: { type: DataTypes.INTEGER, defaultValue: 0 },
        statCompletedTasks: { type: DataTypes.INTEGER, defaultValue: 0 },
        statTotalApplications: { type: DataTypes.INTEGER, defaultValue: 0 },
        statHiredCandidates: { type: DataTypes.INTEGER, defaultValue: 0 },
        statAverageRating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 },
        statTotalRatings: { type: DataTypes.INTEGER, defaultValue: 0 },

        profileCompletion: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            validate: { min: 0, max: 100 }
        },
        isProfilePublic: { type: DataTypes.BOOLEAN, defaultValue: true },
        subscriptionPlan: {
            type: DataTypes.ENUM('free', 'basic', 'premium', 'enterprise'),
            defaultValue: 'free'
        },
        subscriptionExpiry: { type: DataTypes.DATE, allowNull: true }
    },
    {
        sequelize,
        modelName: 'Company',
        tableName: 'companies',
        timestamps: true
    }
);

module.exports = Company;
