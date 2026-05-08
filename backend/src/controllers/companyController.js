const Company = require('../models/Company');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get company profile
// @route   GET /api/companies/profile
// @access  Private (Company only)
exports.getProfile = async (req, res, next) => {
    try {
        const company = await Company.findOne({
            userId: req.user.id
        });

        if (!company) {
            return next(new ErrorResponse('Company profile not found', 404));
        }

        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            data: {
                ...company.toObject(),
                email: user.email
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all public companies (for testing/listing)
// @route   GET /api/companies/public
// @access  Public
exports.getPublicCompanies = async (req, res, next) => {
    try {
        const companies = await Company.find({
            isProfilePublic: true
        }).select('_id companyName logo industry location verification createdAt');

        res.status(200).json({
            success: true,
            count: companies.length,
            data: companies
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get public company profile by ID
// @route   GET /api/companies/public/:companyId
// @access  Public
exports.getPublicProfile = async (req, res, next) => {
    try {
        const company = await Company.findById(req.params.companyId);

        if (!company) {
            return next(new ErrorResponse('Company profile not found', 404));
        }

        // Only return public profile if isProfilePublic is true
        if (!company.isProfilePublic) {
            return next(new ErrorResponse('This profile is private', 403));
        }

        // Return profile without sensitive information
        const publicProfile = {
            _id: company._id,
            companyName: company.companyName,
            logo: company.logo,
            coverImage: company.coverImage,
            companySize: company.companySize,
            industry: company.industry,
            foundedYear: company.foundedYear,
            website: company.website,
            description: company.description,
            location: company.location,
            socialLinks: company.socialLinks,
            culture: company.culture,
            team: company.team,
            verification: {
                isVerified: company.verification.isVerified,
                verifiedAt: company.verification.verifiedAt
            },
            stats: company.stats,
            profileCompletion: company.profileCompletion,
            createdAt: company.createdAt,
            updatedAt: company.updatedAt
        };

        res.status(200).json({
            success: true,
            data: publicProfile
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update basic company info
// @route   PUT /api/companies/profile/basic
// @access  Private (Company only)
exports.updateBasicInfo = async (req, res, next) => {
    try {
        const {
            companyName,
            companySize,
            industry,
            foundedYear,
            website,
            description,
            location
        } = req.body;

        const company = await Company.findOne({
            userId: req.user.id
        });

        if (!company) {
            return next(new ErrorResponse('Company profile not found', 404));
        }

        // Update fields
        if (companyName) company.companyName = companyName;
        if (companySize) company.companySize = companySize;
        if (industry) company.industry = industry;
        if (foundedYear !== undefined) company.foundedYear = foundedYear;
        if (website !== undefined) company.website = website;
        if (description !== undefined) company.description = description;
        if (location) company.location = {
            ...company.location,
            ...location
        };

        await company.save();

        res.status(200).json({
            success: true,
            message: 'Company profile updated successfully',
            data: company
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update contact info
// @route   PUT /api/companies/profile/contact
// @access  Private (Company only)
exports.updateContactInfo = async (req, res, next) => {
    try {
        const company = await Company.findOne({
            userId: req.user.id
        });

        if (!company) {
            return next(new ErrorResponse('Company profile not found', 404));
        }

        company.contactInfo = {
            ...company.contactInfo,
            ...req.body
        };

        await company.save();

        res.status(200).json({
            success: true,
            message: 'Contact info updated successfully',
            data: company
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update social links
// @route   PUT /api/companies/profile/social-links
// @access  Private (Company only)
exports.updateSocialLinks = async (req, res, next) => {
    try {
        const company = await Company.findOne({
            userId: req.user.id
        });

        if (!company) {
            return next(new ErrorResponse('Company profile not found', 404));
        }

        company.socialLinks = {
            ...company.socialLinks,
            ...req.body
        };

        await company.save();

        res.status(200).json({
            success: true,
            message: 'Social links updated successfully',
            data: company
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update culture (values, benefits)
// @route   PUT /api/companies/profile/culture
// @access  Private (Company only)
exports.updateCulture = async (req, res, next) => {
    try {
        const company = await Company.findOne({
            userId: req.user.id
        });

        if (!company) {
            return next(new ErrorResponse('Company profile not found', 404));
        }

        company.culture = {
            ...company.culture,
            ...req.body
        };

        await company.save();

        res.status(200).json({
            success: true,
            message: 'Company culture updated successfully',
            data: company
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add team member
// @route   POST /api/companies/profile/team
// @access  Private (Company only)
exports.addTeamMember = async (req, res, next) => {
    try {
        const company = await Company.findOne({
            userId: req.user.id
        });

        if (!company) {
            return next(new ErrorResponse('Company profile not found', 404));
        }

        company.team.push(req.body);
        await company.save();

        res.status(201).json({
            success: true,
            message: 'Team member added successfully',
            data: company.team[company.team.length - 1]
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update team member
// @route   PUT /api/companies/profile/team/:id
// @access  Private (Company only)
exports.updateTeamMember = async (req, res, next) => {
    try {
        const company = await Company.findOne({
            userId: req.user.id
        });

        if (!company) {
            return next(new ErrorResponse('Company profile not found', 404));
        }

        const teamMember = company.team.id(req.params.id);
        if (!teamMember) {
            return next(new ErrorResponse('Team member not found', 404));
        }

        Object.assign(teamMember, req.body);
        await company.save();

        res.status(200).json({
            success: true,
            message: 'Team member updated successfully',
            data: teamMember
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete team member
// @route   DELETE /api/companies/profile/team/:id
// @access  Private (Company only)
exports.deleteTeamMember = async (req, res, next) => {
    try {
        const company = await Company.findOne({
            userId: req.user.id
        });

        if (!company) {
            return next(new ErrorResponse('Company profile not found', 404));
        }

        company.team.pull(req.params.id);
        await company.save();

        res.status(200).json({
            success: true,
            message: 'Team member deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update profile visibility
// @route   PUT /api/companies/profile/visibility
// @access  Private (Company only)
exports.updateProfileVisibility = async (req, res, next) => {
    try {
        const company = await Company.findOne({
            userId: req.user.id
        });

        if (!company) {
            return next(new ErrorResponse('Company profile not found', 404));
        }

        company.isProfilePublic = req.body.isProfilePublic;
        await company.save();

        res.status(200).json({
            success: true,
            message: 'Profile visibility updated successfully',
            data: {
                isProfilePublic: company.isProfilePublic
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload company logo
// @route   POST /api/companies/profile/logo
// @access  Private (Company only)
exports.uploadLogo = async (req, res, next) => {
    try {
        const company = await Company.findOne({
            userId: req.user.id
        });

        if (!company) {
            return next(new ErrorResponse('Company profile not found', 404));
        }

        if (!req.file) {
            return next(new ErrorResponse('Please upload a file', 400));
        }

        company.logo = `/uploads/logos/${req.file.filename}`;
        await company.save();

        res.status(200).json({
            success: true,
            message: 'Logo uploaded successfully',
            data: {
                logo: company.logo
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload cover image
// @route   POST /api/companies/profile/cover
// @access  Private (Company only)
exports.uploadCoverImage = async (req, res, next) => {
    try {
        const company = await Company.findOne({
            userId: req.user.id
        });

        if (!company) {
            return next(new ErrorResponse('Company profile not found', 404));
        }

        if (!req.file) {
            return next(new ErrorResponse('Please upload a file', 400));
        }

        company.coverImage = `/uploads/covers/${req.file.filename}`;
        await company.save();

        res.status(200).json({
            success: true,
            message: 'Cover image uploaded successfully',
            data: {
                coverImage: company.coverImage
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload team member avatar
// @route   POST /api/companies/profile/team/avatar
// @access  Private (Company only)
exports.uploadTeamMemberAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(new ErrorResponse('Please upload a file', 400));
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        res.status(200).json({
            success: true,
            message: 'Avatar uploaded successfully',
            data: {
                avatar: avatarUrl
            }
        });
    } catch (error) {
        next(error);
    }
};