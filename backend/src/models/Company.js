const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    companyName: {
        type: String,
        required: [true, 'Please provide company name'],
        trim: true
    },
    companySize: {
        type: String,
        enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
    },
    industry: {
        type: String,
        required: [true, 'Please provide industry']
    },
    foundedYear: {
        type: Number,
        min: 1800,
        max: new Date().getFullYear()
    },
    website: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    logo: {
        type: String
    },
    coverImage: {
        type: String
    },
    location: {
        address: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
    },
    contactInfo: {
        phone: String,
        email: String,
        contactPerson: {
            name: String,
            designation: String,
            email: String,
            phone: String
        }
    },
    socialLinks: {
        linkedin: String,
        twitter: String,
        facebook: String,
        instagram: String
    },
    culture: {
        values: [String],
        benefits: [String],
        workEnvironment: String
    },
    team: [{
        name: String,
        designation: String,
        avatar: String,
        bio: String,
        linkedIn: String
    }],
    verification: {
        isVerified: {
            type: Boolean,
            default: false
        },
        verifiedAt: Date,
        documents: [{
            type: String,
            url: String,
            uploadedAt: Date
        }]
    },
    stats: {
        activeTasks: {
            type: Number,
            default: 0
        },
        completedTasks: {
            type: Number,
            default: 0
        },
        totalApplications: {
            type: Number,
            default: 0
        },
        hiredCandidates: {
            type: Number,
            default: 0
        },
        averageRating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        totalRatings: {
            type: Number,
            default: 0
        }
    },
    profileCompletion: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    isProfilePublic: {
        type: Boolean,
        default: true
    },
    subscriptionPlan: {
        type: String,
        enum: ['free', 'basic', 'premium', 'enterprise'],
        default: 'free'
    },
    subscriptionExpiry: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Calculate profile completion percentage
companySchema.methods.calculateProfileCompletion = function() {
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
    if (this.location && this.location.city && this.location.country) completion += weights.location;
    if (this.contactInfo && this.contactInfo.phone && this.contactInfo.email) completion += weights.contactInfo;
    if (this.culture && this.culture.values && this.culture.values.length > 0) completion += weights.culture;
    if (this.team && this.team.length > 0) completion += weights.team;
    if (this.logo) completion += weights.logo;

    this.profileCompletion = completion;
    return completion;
};

// Update profile completion before saving
companySchema.pre('save', function(next) {
    this.calculateProfileCompletion();
    next();
});

module.exports = mongoose.model('Company', companySchema);