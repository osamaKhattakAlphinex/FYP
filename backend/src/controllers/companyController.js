const {
    User,
    Company,
    CompanyTeamMember,
    CompanyVerificationDocument,
    recalcCompanyCompletion
} = require('../models');
const ErrorResponse = require('../utils/errorResponse');

const companyIncludes = () => ([
    { model: CompanyTeamMember, as: 'team' },
    { model: CompanyVerificationDocument, as: 'verificationDocuments' }
]);

const findCompanyByUser = (userId) =>
    Company.findOne({ where: { userId }, include: companyIncludes() });

// @desc    Get company profile
exports.getProfile = async (req, res, next) => {
    try {
        const company = await findCompanyByUser(req.user.id);
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const user = await User.findByPk(req.user.id);

        res.status(200).json({
            success: true,
            data: { ...company.toJSON(), email: user.email }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all public companies
exports.getPublicCompanies = async (req, res, next) => {
    try {
        const companies = await Company.findAll({
            where: { isProfilePublic: true },
            attributes: [
                'id', 'companyName', 'logo', 'industry',
                'locationCity', 'locationState', 'locationCountry',
                'verificationIsVerified', 'createdAt'
            ]
        });

        res.status(200).json({
            success: true,
            count: companies.length,
            data: companies.map((c) => c.toJSON())
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get public company profile by ID
exports.getPublicProfile = async (req, res, next) => {
    try {
        const company = await Company.findByPk(req.params.companyId, { include: companyIncludes() });
        if (!company) return next(new ErrorResponse('Company profile not found', 404));
        if (!company.isProfilePublic) return next(new ErrorResponse('This profile is private', 403));

        const data = company.toJSON();
        const publicProfile = {
            _id: data._id,
            companyName: data.companyName,
            logo: data.logo,
            coverImage: data.coverImage,
            companySize: data.companySize,
            industry: data.industry,
            foundedYear: data.foundedYear,
            website: data.website,
            description: data.description,
            location: data.location,
            socialLinks: data.socialLinks,
            culture: data.culture,
            team: data.team,
            verification: {
                isVerified: data.verification.isVerified,
                verifiedAt: data.verification.verifiedAt
            },
            stats: data.stats,
            profileCompletion: data.profileCompletion,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        };

        res.status(200).json({ success: true, data: publicProfile });
    } catch (error) {
        next(error);
    }
};

// @desc    Update basic company info
exports.updateBasicInfo = async (req, res, next) => {
    try {
        const { companyName, companySize, industry, foundedYear, website, description, location } = req.body;

        const company = await Company.findOne({ where: { userId: req.user.id } });
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        if (companyName) company.companyName = companyName;
        if (companySize) company.companySize = companySize;
        if (industry) company.industry = industry;
        if (foundedYear !== undefined) company.foundedYear = foundedYear;
        if (website !== undefined) company.website = website;
        if (description !== undefined) company.description = description;
        if (location) {
            if (location.address !== undefined) company.locationAddress = location.address;
            if (location.city !== undefined) company.locationCity = location.city;
            if (location.state !== undefined) company.locationState = location.state;
            if (location.country !== undefined) company.locationCountry = location.country;
            if (location.zipCode !== undefined) company.locationZipCode = location.zipCode;
        }

        await company.save();
        await recalcCompanyCompletion(company);

        const fresh = await findCompanyByUser(req.user.id);
        res.status(200).json({
            success: true,
            message: 'Company profile updated successfully',
            data: fresh.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update contact info
exports.updateContactInfo = async (req, res, next) => {
    try {
        const company = await Company.findOne({ where: { userId: req.user.id } });
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const { phone, email, contactPerson } = req.body;
        if (phone !== undefined) company.contactPhone = phone;
        if (email !== undefined) company.contactEmail = email;
        if (contactPerson) {
            if (contactPerson.name !== undefined) company.contactPersonName = contactPerson.name;
            if (contactPerson.designation !== undefined) company.contactPersonDesignation = contactPerson.designation;
            if (contactPerson.email !== undefined) company.contactPersonEmail = contactPerson.email;
            if (contactPerson.phone !== undefined) company.contactPersonPhone = contactPerson.phone;
        }

        await company.save();
        await recalcCompanyCompletion(company);

        const fresh = await findCompanyByUser(req.user.id);
        res.status(200).json({
            success: true,
            message: 'Contact info updated successfully',
            data: fresh.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update social links
exports.updateSocialLinks = async (req, res, next) => {
    try {
        const company = await Company.findOne({ where: { userId: req.user.id } });
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const { linkedin, twitter, facebook, instagram } = req.body;
        if (linkedin !== undefined) company.socialLinkedin = linkedin;
        if (twitter !== undefined) company.socialTwitter = twitter;
        if (facebook !== undefined) company.socialFacebook = facebook;
        if (instagram !== undefined) company.socialInstagram = instagram;

        await company.save();

        const fresh = await findCompanyByUser(req.user.id);
        res.status(200).json({
            success: true,
            message: 'Social links updated successfully',
            data: fresh.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update culture
exports.updateCulture = async (req, res, next) => {
    try {
        const company = await Company.findOne({ where: { userId: req.user.id } });
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const { values, benefits, workEnvironment } = req.body;
        if (values !== undefined) company.cultureValues = values;
        if (benefits !== undefined) company.cultureBenefits = benefits;
        if (workEnvironment !== undefined) company.cultureWorkEnvironment = workEnvironment;

        await company.save();
        await recalcCompanyCompletion(company);

        const fresh = await findCompanyByUser(req.user.id);
        res.status(200).json({
            success: true,
            message: 'Company culture updated successfully',
            data: fresh.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add team member
exports.addTeamMember = async (req, res, next) => {
    try {
        const company = await Company.findOne({ where: { userId: req.user.id } });
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const member = await CompanyTeamMember.create({ ...req.body, companyId: company.id });
        await recalcCompanyCompletion(company);

        res.status(201).json({
            success: true,
            message: 'Team member added successfully',
            data: member.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update team member
exports.updateTeamMember = async (req, res, next) => {
    try {
        const company = await Company.findOne({ where: { userId: req.user.id } });
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const member = await CompanyTeamMember.findOne({
            where: { id: req.params.id, companyId: company.id }
        });
        if (!member) return next(new ErrorResponse('Team member not found', 404));

        await member.update(req.body);

        res.status(200).json({
            success: true,
            message: 'Team member updated successfully',
            data: member.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete team member
exports.deleteTeamMember = async (req, res, next) => {
    try {
        const company = await Company.findOne({ where: { userId: req.user.id } });
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        const deleted = await CompanyTeamMember.destroy({
            where: { id: req.params.id, companyId: company.id }
        });
        if (!deleted) return next(new ErrorResponse('Team member not found', 404));
        await recalcCompanyCompletion(company);

        res.status(200).json({ success: true, message: 'Team member deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Update profile visibility
exports.updateProfileVisibility = async (req, res, next) => {
    try {
        const company = await Company.findOne({ where: { userId: req.user.id } });
        if (!company) return next(new ErrorResponse('Company profile not found', 404));

        company.isProfilePublic = req.body.isProfilePublic;
        await company.save();

        res.status(200).json({
            success: true,
            message: 'Profile visibility updated successfully',
            data: { isProfilePublic: company.isProfilePublic }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload company logo
exports.uploadLogo = async (req, res, next) => {
    try {
        const company = await Company.findOne({ where: { userId: req.user.id } });
        if (!company) return next(new ErrorResponse('Company profile not found', 404));
        if (!req.file) return next(new ErrorResponse('Please upload a file', 400));

        company.logo = `/uploads/logos/${req.file.filename}`;
        await company.save();
        await recalcCompanyCompletion(company);

        res.status(200).json({
            success: true,
            message: 'Logo uploaded successfully',
            data: { logo: company.logo }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload cover image
exports.uploadCoverImage = async (req, res, next) => {
    try {
        const company = await Company.findOne({ where: { userId: req.user.id } });
        if (!company) return next(new ErrorResponse('Company profile not found', 404));
        if (!req.file) return next(new ErrorResponse('Please upload a file', 400));

        company.coverImage = `/uploads/covers/${req.file.filename}`;
        await company.save();

        res.status(200).json({
            success: true,
            message: 'Cover image uploaded successfully',
            data: { coverImage: company.coverImage }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload team member avatar
exports.uploadTeamMemberAvatar = async (req, res, next) => {
    try {
        if (!req.file) return next(new ErrorResponse('Please upload a file', 400));

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        res.status(200).json({
            success: true,
            message: 'Avatar uploaded successfully',
            data: { avatar: avatarUrl }
        });
    } catch (error) {
        next(error);
    }
};
