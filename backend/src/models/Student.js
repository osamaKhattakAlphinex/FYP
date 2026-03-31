const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: [true, 'Please provide first name'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Please provide last name'],
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    dateOfBirth: {
        type: Date
    },
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    location: {
        city: String,
        state: String,
        country: String
    },
    education: [{
        institution: {
            type: String,
            required: true
        },
        degree: {
            type: String,
            required: true
        },
        fieldOfStudy: String,
        startDate: Date,
        endDate: Date,
        current: {
            type: Boolean,
            default: false
        },
        grade: String,
        description: String
    }],
    skills: [{
        name: {
            type: String,
            required: true
        },
        level: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert'],
            default: 'intermediate'
        }
    }],
    experience: [{
        title: {
            type: String,
            required: true
        },
        company: String,
        location: String,
        startDate: Date,
        endDate: Date,
        current: {
            type: Boolean,
            default: false
        },
        description: String
    }],
    projects: [{
        title: {
            type: String,
            required: true
        },
        description: String,
        technologies: [String],
        link: String,
        githubLink: String,
        startDate: Date,
        endDate: Date,
        current: {
            type: Boolean,
            default: false
        }
    }],
    certificates: [{
        title: {
            type: String,
            required: true
        },
        issuer: String,
        issueDate: Date,
        expiryDate: Date,
        credentialId: String,
        credentialUrl: String
    }],
    socialLinks: {
        linkedin: String,
        github: String,
        portfolio: String,
        twitter: String
    },
    resume: {
        url: String,
        uploadedAt: Date
    },
    preferences: {
        jobTypes: [{
            type: String,
            enum: ['internship', 'full-time', 'part-time', 'contract', 'freelance']
        }],
        industries: [String],
        locations: [String],
        remoteWork: {
            type: Boolean,
            default: true
        }
    },
    stats: {
        tasksCompleted: {
            type: Number,
            default: 0
        },
        tasksInProgress: {
            type: Number,
            default: 0
        },
        certificatesEarned: {
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
studentSchema.methods.calculateProfileCompletion = function() {
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

    if (this.firstName && this.lastName && this.phone) completion += weights.basicInfo;
    if (this.education && this.education.length > 0) completion += weights.education;
    if (this.skills && this.skills.length >= 3) completion += weights.skills;
    if (this.experience && this.experience.length > 0) completion += weights.experience;
    if (this.projects && this.projects.length > 0) completion += weights.projects;
    if (this.bio) completion += weights.bio;
    if (this.resume && this.resume.url) completion += weights.resume;

    this.profileCompletion = completion;
    return completion;
};

// Update profile completion before saving
studentSchema.pre('save', function(next) {
    this.calculateProfileCompletion();
    next();
});

module.exports = mongoose.model('Student', studentSchema);