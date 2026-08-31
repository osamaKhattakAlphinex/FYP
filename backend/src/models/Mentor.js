const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

const AVAILABILITY_STATUSES = ['available', 'limited', 'unavailable'];
const VERIFICATION_STATUSES = ['pending', 'approved', 'rejected'];

class Mentor extends Model {
    isVerified() {
        return this.verificationStatus === 'approved';
    }

    // activeCount is COUNTed by the controller inside the assign transaction —
    // activeMenteeCount on the row is a display cache and must not gate anything.
    isAssignable(activeCount) {
        if (!this.isVerified()) return false;
        if (this.availabilityStatus === 'unavailable') return false;
        const used = Number.isFinite(activeCount) ? activeCount : this.activeMenteeCount;
        return used < this.maxActiveMentees;
    }

    getFullName() {
        return `${this.firstName} ${this.lastName}`.trim();
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;

        values.location = {
            city: values.locationCity || undefined,
            country: values.locationCountry || undefined
        };

        values.social = {
            linkedin: values.socialLinkedin || undefined,
            github: values.socialGithub || undefined,
            portfolio: values.socialPortfolio || undefined
        };

        values.availability = {
            status: values.availabilityStatus,
            maxActiveMentees: values.maxActiveMentees,
            activeMenteeCount: values.activeMenteeCount,
            hasCapacity: values.activeMenteeCount < values.maxActiveMentees
        };

        values.verification = {
            status: values.verificationStatus,
            note: values.verificationNote || undefined,
            verifiedAt: values.verifiedAt || undefined,
            isVerified: values.verificationStatus === 'approved'
        };

        values.stats = {
            totalMentees: values.statTotalMentees,
            completedMentorships: values.statCompletedMentorships,
            averageRating: values.statAverageRating != null ? Number(values.statAverageRating) : 0,
            totalRatings: values.statTotalRatings
        };

        if (values.user && typeof values.user === 'object') {
            values.user = values.user.toJSON ? values.user.toJSON() : values.user;
        }
        if (Array.isArray(values.expertise)) {
            values.expertise = values.expertise.map((e) => (e.toJSON ? e.toJSON() : e));
        }

        [
            'locationCity', 'locationCountry',
            'socialLinkedin', 'socialGithub', 'socialPortfolio',
            'availabilityStatus', 'maxActiveMentees', 'activeMenteeCount',
            'verificationStatus', 'verificationNote', 'verifiedAt',
            'statTotalMentees', 'statCompletedMentorships', 'statAverageRating', 'statTotalRatings'
        ].forEach((k) => delete values[k]);

        return values;
    }
}

Mentor.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        userId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
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
        profilePicture: { type: DataTypes.STRING(500), allowNull: true },
        headline: { type: DataTypes.STRING(255), allowNull: true },
        bio: { type: DataTypes.TEXT, allowNull: true },
        phone: { type: DataTypes.STRING(50), allowNull: true },
        currentPosition: { type: DataTypes.STRING(150), allowNull: true },
        currentCompany: { type: DataTypes.STRING(150), allowNull: true },
        yearsOfExperience: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: { min: 0, max: 60 }
        },
        locationCity: { type: DataTypes.STRING(100), allowNull: true },
        locationCountry: { type: DataTypes.STRING(100), allowNull: true },
        socialLinkedin: { type: DataTypes.STRING(500), allowNull: true },
        socialGithub: { type: DataTypes.STRING(500), allowNull: true },
        socialPortfolio: { type: DataTypes.STRING(500), allowNull: true },

        availabilityStatus: {
            type: DataTypes.ENUM(...AVAILABILITY_STATUSES),
            allowNull: false,
            defaultValue: 'available'
        },
        maxActiveMentees: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 5,
            validate: { min: 1, max: 50 }
        },
        // Display cache only. Refreshed from a COUNT whenever an assignment changes state.
        activeMenteeCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

        verificationStatus: {
            type: DataTypes.ENUM(...VERIFICATION_STATUSES),
            allowNull: false,
            defaultValue: 'pending'
        },
        verificationNote: { type: DataTypes.STRING(500), allowNull: true },
        verifiedAt: { type: DataTypes.DATE, allowNull: true },
        verifiedByUserId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL'
        },

        statTotalMentees: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        statCompletedMentorships: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        statAverageRating: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 0 },
        statTotalRatings: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

        profileCompletion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        isProfilePublic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
    },
    {
        sequelize,
        modelName: 'Mentor',
        tableName: 'mentors',
        timestamps: true,
        // Declared here, NOT as attribute-level `unique: true`. Under DB_SYNC=alter
        // Sequelize re-runs changeColumn on every boot and MySQL re-appends an
        // attribute-level UNIQUE each time, accumulating duplicate indexes.
        // Named indexes are diffed by name and stay idempotent.
        indexes: [
            { unique: true, fields: ['userId'] },
            { fields: ['verificationStatus'] },
            { fields: ['availabilityStatus'] },
            { fields: ['isProfilePublic', 'verificationStatus'] }
        ]
    }
);

Mentor.AVAILABILITY_STATUSES = AVAILABILITY_STATUSES;
Mentor.VERIFICATION_STATUSES = VERIFICATION_STATUSES;

module.exports = Mentor;
