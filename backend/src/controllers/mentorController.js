const { Op } = require('sequelize');
const {
    User,
    Mentor,
    MentorExpertise,
    MentorAssignment,
    recalcMentorCompletion,
    recalcMentorActiveCount
} = require('../models');
const ErrorResponse = require('../utils/errorResponse');
const { notifyMentorOfVerificationDecision } = require('../utils/mentorNotifications');

const mentorIncludes = () => ([
    { model: MentorExpertise, as: 'expertise' }
]);

const findMentorByUser = (userId) =>
    Mentor.findOne({ where: { userId }, include: mentorIncludes() });

const PUBLIC_MENTOR_ATTRS = [
    'id', 'firstName', 'lastName', 'profilePicture', 'headline', 'bio',
    'currentPosition', 'currentCompany', 'yearsOfExperience',
    'locationCity', 'locationCountry', 'socialLinkedin', 'socialGithub', 'socialPortfolio',
    'availabilityStatus', 'maxActiveMentees', 'activeMenteeCount',
    'verificationStatus', 'verifiedAt',
    'statTotalMentees', 'statCompletedMentorships', 'statAverageRating', 'statTotalRatings',
    'profileCompletion', 'isProfilePublic', 'createdAt'
];

// Fields a mentor may edit on their own profile. Verification and stats are
// deliberately excluded — only an admin moves verificationStatus.
const EDITABLE_PROFILE_FIELDS = [
    'firstName', 'lastName', 'headline', 'bio', 'phone',
    'currentPosition', 'currentCompany', 'yearsOfExperience',
    'locationCity', 'locationCountry',
    'socialLinkedin', 'socialGithub', 'socialPortfolio'
];

// ---------------------------------------------------------------------------
// Mentor self-service
// ---------------------------------------------------------------------------

// @desc    Get the logged-in mentor's profile
// @route   GET /api/mentors/me
// @access  Private (mentor)
exports.getProfile = async (req, res, next) => {
    try {
        const mentor = await findMentorByUser(req.user.id);
        if (!mentor) return next(new ErrorResponse('Mentor profile not found', 404));

        const user = await User.findByPk(req.user.id);

        res.status(200).json({
            success: true,
            data: { ...mentor.toJSON(), email: user.email }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update the logged-in mentor's profile
// @route   PUT /api/mentors/me
// @access  Private (mentor)
exports.updateProfile = async (req, res, next) => {
    try {
        const mentor = await Mentor.findOne({ where: { userId: req.user.id } });
        if (!mentor) return next(new ErrorResponse('Mentor profile not found', 404));

        const updates = {};
        EDITABLE_PROFILE_FIELDS.forEach((field) => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        // Accept the nested shape the frontend gets back from toJSON().
        if (req.body.location && typeof req.body.location === 'object') {
            if (req.body.location.city !== undefined) updates.locationCity = req.body.location.city;
            if (req.body.location.country !== undefined) updates.locationCountry = req.body.location.country;
        }
        if (req.body.social && typeof req.body.social === 'object') {
            if (req.body.social.linkedin !== undefined) updates.socialLinkedin = req.body.social.linkedin;
            if (req.body.social.github !== undefined) updates.socialGithub = req.body.social.github;
            if (req.body.social.portfolio !== undefined) updates.socialPortfolio = req.body.social.portfolio;
        }

        await mentor.update(updates);
        await recalcMentorCompletion(mentor);

        const fresh = await findMentorByUser(req.user.id);

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: fresh.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update availability (status + capacity)
// @route   PUT /api/mentors/me/availability
// @access  Private (mentor)
exports.updateAvailability = async (req, res, next) => {
    try {
        const mentor = await Mentor.findOne({ where: { userId: req.user.id } });
        if (!mentor) return next(new ErrorResponse('Mentor profile not found', 404));

        const { availabilityStatus, maxActiveMentees } = req.body;

        if (availabilityStatus !== undefined) mentor.availabilityStatus = availabilityStatus;

        if (maxActiveMentees !== undefined) {
            // Never let the cap drop below the mentorships already running,
            // otherwise the mentor sits permanently over capacity.
            const activeCount = await MentorAssignment.count({
                where: { mentorId: mentor.id, status: 'active' }
            });
            if (Number(maxActiveMentees) < activeCount) {
                return next(
                    new ErrorResponse(
                        'You already have ' + activeCount + ' active mentee(s); capacity cannot be lower than that',
                        400
                    )
                );
            }
            mentor.maxActiveMentees = maxActiveMentees;
        }

        await mentor.save();

        res.status(200).json({
            success: true,
            message: 'Availability updated successfully',
            data: mentor.toJSON().availability
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Toggle public visibility of the mentor profile
// @route   PUT /api/mentors/me/visibility
// @access  Private (mentor)
exports.updateProfileVisibility = async (req, res, next) => {
    try {
        const mentor = await Mentor.findOne({ where: { userId: req.user.id } });
        if (!mentor) return next(new ErrorResponse('Mentor profile not found', 404));

        mentor.isProfilePublic = req.body.isProfilePublic;
        await mentor.save();

        res.status(200).json({
            success: true,
            message: 'Profile visibility updated successfully',
            data: { isProfilePublic: mentor.isProfilePublic }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload mentor profile picture
// @route   POST /api/mentors/me/avatar
// @access  Private (mentor)
exports.uploadAvatar = async (req, res, next) => {
    try {
        const mentor = await Mentor.findOne({ where: { userId: req.user.id } });
        if (!mentor) return next(new ErrorResponse('Mentor profile not found', 404));
        if (!req.file) return next(new ErrorResponse('Please upload a file', 400));

        mentor.profilePicture = '/uploads/avatars/' + req.file.filename;
        await mentor.save();

        res.status(200).json({
            success: true,
            message: 'Profile picture uploaded successfully',
            data: { profilePicture: mentor.profilePicture }
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Expertise
// ---------------------------------------------------------------------------

// @desc    Add an expertise entry
// @route   POST /api/mentors/me/expertise
// @access  Private (mentor)
exports.addExpertise = async (req, res, next) => {
    try {
        const mentor = await Mentor.findOne({ where: { userId: req.user.id } });
        if (!mentor) return next(new ErrorResponse('Mentor profile not found', 404));

        const name = String(req.body.name || '').trim();
        const existing = await MentorExpertise.findOne({
            where: { mentorId: mentor.id, name }
        });
        if (existing) return next(new ErrorResponse('That expertise is already listed', 400));

        const expertise = await MentorExpertise.create({
            mentorId: mentor.id,
            name,
            level: req.body.level || 'Advanced',
            yearsOfExperience:
                req.body.yearsOfExperience === undefined ? null : req.body.yearsOfExperience
        });
        await recalcMentorCompletion(mentor);

        res.status(201).json({
            success: true,
            message: 'Expertise added successfully',
            data: expertise.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update an expertise entry
// @route   PUT /api/mentors/me/expertise/:expertiseId
// @access  Private (mentor)
exports.updateExpertise = async (req, res, next) => {
    try {
        const mentor = await Mentor.findOne({ where: { userId: req.user.id } });
        if (!mentor) return next(new ErrorResponse('Mentor profile not found', 404));

        const expertise = await MentorExpertise.findOne({
            where: { id: req.params.expertiseId, mentorId: mentor.id }
        });
        if (!expertise) return next(new ErrorResponse('Expertise not found', 404));

        await expertise.update(req.body);

        res.status(200).json({
            success: true,
            message: 'Expertise updated successfully',
            data: expertise.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete an expertise entry
// @route   DELETE /api/mentors/me/expertise/:expertiseId
// @access  Private (mentor)
exports.deleteExpertise = async (req, res, next) => {
    try {
        const mentor = await Mentor.findOne({ where: { userId: req.user.id } });
        if (!mentor) return next(new ErrorResponse('Mentor profile not found', 404));

        const deleted = await MentorExpertise.destroy({
            where: { id: req.params.expertiseId, mentorId: mentor.id }
        });
        if (!deleted) return next(new ErrorResponse('Expertise not found', 404));
        await recalcMentorCompletion(mentor);

        res.status(200).json({ success: true, message: 'Expertise deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

// @desc    Dashboard counters for the logged-in mentor
// @route   GET /api/mentors/me/stats
// @access  Private (mentor)
exports.getMentorStats = async (req, res, next) => {
    try {
        const mentor = await Mentor.findOne({ where: { userId: req.user.id } });
        if (!mentor) return next(new ErrorResponse('Mentor profile not found', 404));

        const rows = await MentorAssignment.findAll({
            where: { mentorId: mentor.id },
            attributes: ['status']
        });

        const statusCounts = MentorAssignment.STATUSES.reduce((acc, s) => {
            acc[s] = 0;
            return acc;
        }, {});
        rows.forEach((r) => { statusCounts[r.status] += 1; });

        // Recompute rather than trusting the cached column.
        const activeCount = await recalcMentorActiveCount(mentor.id);

        res.status(200).json({
            success: true,
            data: {
                statusCounts,
                totalAssignments: rows.length,
                activeMentees: activeCount,
                capacity: {
                    max: mentor.maxActiveMentees,
                    used: activeCount,
                    remaining: Math.max(0, mentor.maxActiveMentees - activeCount)
                },
                averageRating: Number(mentor.statAverageRating) || 0,
                totalRatings: mentor.statTotalRatings,
                verificationStatus: mentor.verificationStatus,
                profileCompletion: mentor.profileCompletion
            }
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Public directory
// ---------------------------------------------------------------------------

// @desc    List publicly visible, approved mentors
// @route   GET /api/mentors/public
// @access  Public
exports.getPublicMentors = async (req, res, next) => {
    try {
        const { page = 1, limit = 12, search = '', expertise = '' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;

        // Only approved mentors are ever exposed publicly.
        const where = { isProfilePublic: true, verificationStatus: 'approved' };

        if (search) {
            where[Op.or] = [
                { firstName: { [Op.like]: '%' + search + '%' } },
                { lastName: { [Op.like]: '%' + search + '%' } },
                { headline: { [Op.like]: '%' + search + '%' } },
                { currentCompany: { [Op.like]: '%' + search + '%' } }
            ];
        }

        const include = [{ model: MentorExpertise, as: 'expertise' }];
        if (expertise) {
            include[0].where = { name: { [Op.like]: '%' + expertise + '%' } };
        }

        const { rows, count } = await Mentor.findAndCountAll({
            where,
            attributes: PUBLIC_MENTOR_ATTRS,
            include,
            order: [['statAverageRating', 'DESC'], ['yearsOfExperience', 'DESC']],
            offset,
            limit: limitNum,
            distinct: true
        });

        const totalPages = Math.ceil(count / limitNum);

        res.status(200).json({
            success: true,
            data: {
                mentors: rows.map((m) => m.toJSON()),
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalMentors: count,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1,
                    limit: limitNum
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Public mentor profile
// @route   GET /api/mentors/public/:mentorId
// @access  Public
exports.getPublicMentor = async (req, res, next) => {
    try {
        const mentor = await Mentor.findOne({
            where: {
                id: req.params.mentorId,
                isProfilePublic: true,
                verificationStatus: 'approved'
            },
            attributes: PUBLIC_MENTOR_ATTRS,
            include: mentorIncludes()
        });
        if (!mentor) return next(new ErrorResponse('Mentor not found', 404));

        res.status(200).json({ success: true, data: mentor.toJSON() });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Admin verification
// Mounted on the existing admin router, which already applies
// protect + authorize('admin') to every route.
// ---------------------------------------------------------------------------

// @desc    List mentors for the verification queue
// @route   GET /api/admin/mentors
// @access  Private (admin)
exports.listMentorsForAdmin = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, status = 'all', search = '' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;

        const where = {};
        if (status !== 'all') {
            if (!Mentor.VERIFICATION_STATUSES.includes(status)) {
                return next(new ErrorResponse('Invalid verification status filter', 400));
            }
            where.verificationStatus = status;
        }
        if (search) {
            where[Op.or] = [
                { firstName: { [Op.like]: '%' + search + '%' } },
                { lastName: { [Op.like]: '%' + search + '%' } },
                { headline: { [Op.like]: '%' + search + '%' } }
            ];
        }

        const { rows, count } = await Mentor.findAndCountAll({
            where,
            include: [
                { model: MentorExpertise, as: 'expertise' },
                { model: User, as: 'user', attributes: ['id', 'email', 'isEmailVerified', 'isActive'] }
            ],
            order: [['createdAt', 'DESC']],
            offset,
            limit: limitNum,
            distinct: true
        });

        const all = await Mentor.findAll({ attributes: ['verificationStatus'] });
        const statusCounts = Mentor.VERIFICATION_STATUSES.reduce((acc, s) => {
            acc[s] = 0;
            return acc;
        }, {});
        all.forEach((m) => { statusCounts[m.verificationStatus] += 1; });

        const totalPages = Math.ceil(count / limitNum);

        res.status(200).json({
            success: true,
            data: {
                mentors: rows.map((m) => m.toJSON()),
                statusCounts,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalMentors: count,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1,
                    limit: limitNum
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Approve or reject a mentor
// @route   PUT /api/admin/mentors/:mentorId/verify
// @access  Private (admin)
exports.reviewMentorVerification = async (req, res, next) => {
    try {
        const { status, note } = req.body;

        if (!Mentor.VERIFICATION_STATUSES.includes(status)) {
            return next(new ErrorResponse('Status must be approved, rejected or pending', 400));
        }

        const mentor = await Mentor.findByPk(req.params.mentorId, { include: mentorIncludes() });
        if (!mentor) return next(new ErrorResponse('Mentor not found', 404));

        mentor.verificationStatus = status;
        mentor.verificationNote = note || null;
        mentor.verifiedAt = status === 'pending' ? null : new Date();
        mentor.verifiedByUserId = status === 'pending' ? null : req.user.id;
        await mentor.save();

        // Best-effort — never blocks the response.
        notifyMentorOfVerificationDecision(mentor.id, status, note || null);

        res.status(200).json({
            success: true,
            message: 'Mentor verification set to ' + status,
            data: mentor.toJSON()
        });
    } catch (error) {
        next(error);
    }
};
