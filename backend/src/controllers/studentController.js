const Student = require('../models/Student');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get student profile
// @route   GET /api/students/profile
// @access  Private (Student only)
exports.getProfile = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        const user = await User.findById(req.user.id);

        res.status(200).json({
            success: true,
            data: {
                ...student.toObject(),
                email: user.email
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all public students (for testing/listing)
// @route   GET /api/students/public
// @access  Public
exports.getPublicStudents = async (req, res, next) => {
    try {
        const students = await Student.find({
            isProfilePublic: true
        }).select('_id firstName lastName profilePicture headline location skills createdAt');

        res.status(200).json({
            success: true,
            count: students.length,
            data: students
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get public student profile by ID
// @route   GET /api/students/public/:studentId
// @access  Public
exports.getPublicProfile = async (req, res, next) => {
    try {
        const student = await Student.findById(req.params.studentId);

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        // Only return public profile if isProfilePublic is true
        if (!student.isProfilePublic) {
            return next(new ErrorResponse('This profile is private', 403));
        }

        // Return profile without sensitive information
        const publicProfile = {
            _id: student._id,
            firstName: student.firstName,
            lastName: student.lastName,
            profilePicture: student.profilePicture,
            headline: student.headline,
            bio: student.bio,
            location: student.location,
            education: student.education,
            skills: student.skills,
            experience: student.experience,
            projects: student.projects,
            certificates: student.certificates,
            socialLinks: student.socialLinks,
            profileCompletion: student.profileCompletion,
            isProfilePublic: student.isProfilePublic,
            stats: student.stats,
            createdAt: student.createdAt,
            updatedAt: student.updatedAt
        };

        res.status(200).json({
            success: true,
            data: publicProfile
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update basic profile info
// @route   PUT /api/students/profile/basic
// @access  Private (Student only)
exports.updateBasicInfo = async (req, res, next) => {
    try {
        const {
            firstName,
            lastName,
            headline,
            phone,
            dateOfBirth,
            bio,
            location
        } = req.body;

        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        // Update fields
        if (firstName) student.firstName = firstName;
        if (lastName) student.lastName = lastName;
        if (headline !== undefined) student.headline = headline;
        if (phone !== undefined) student.phone = phone;
        if (dateOfBirth !== undefined) student.dateOfBirth = dateOfBirth;
        if (bio !== undefined) student.bio = bio;
        if (location) student.location = {
            ...student.location,
            ...location
        };

        await student.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: student
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add/Update education
// @route   POST /api/students/profile/education
// @access  Private (Student only)
exports.addEducation = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        student.education.push(req.body);
        await student.save();

        res.status(201).json({
            success: true,
            message: 'Education added successfully',
            data: student.education[student.education.length - 1]
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update education
// @route   PUT /api/students/profile/education/:id
// @access  Private (Student only)
exports.updateEducation = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        const education = student.education.id(req.params.id);

        if (!education) {
            return next(new ErrorResponse('Education not found', 404));
        }

        Object.assign(education, req.body);
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Education updated successfully',
            data: education
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete education
// @route   DELETE /api/students/profile/education/:id
// @access  Private (Student only)
exports.deleteEducation = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        student.education.pull(req.params.id);
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Education deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add skill
// @route   POST /api/students/profile/skills
// @access  Private (Student only)
exports.addSkill = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        student.skills.push(req.body);
        await student.save();

        res.status(201).json({
            success: true,
            message: 'Skill added successfully',
            data: student.skills[student.skills.length - 1]
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update skill
// @route   PUT /api/students/profile/skills/:id
// @access  Private (Student only)
exports.updateSkill = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        const skill = student.skills.id(req.params.id);

        if (!skill) {
            return next(new ErrorResponse('Skill not found', 404));
        }

        Object.assign(skill, req.body);
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Skill updated successfully',
            data: skill
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete skill
// @route   DELETE /api/students/profile/skills/:id
// @access  Private (Student only)
exports.deleteSkill = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        student.skills.pull(req.params.id);
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Skill deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add experience
// @route   POST /api/students/profile/experience
// @access  Private (Student only)
exports.addExperience = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        student.experience.push(req.body);
        await student.save();

        res.status(201).json({
            success: true,
            message: 'Experience added successfully',
            data: student.experience[student.experience.length - 1]
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update experience
// @route   PUT /api/students/profile/experience/:id
// @access  Private (Student only)
exports.updateExperience = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        const experience = student.experience.id(req.params.id);

        if (!experience) {
            return next(new ErrorResponse('Experience not found', 404));
        }

        Object.assign(experience, req.body);
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Experience updated successfully',
            data: experience
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete experience
// @route   DELETE /api/students/profile/experience/:id
// @access  Private (Student only)
exports.deleteExperience = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        student.experience.pull(req.params.id);
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Experience deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add project
// @route   POST /api/students/profile/projects
// @access  Private (Student only)
exports.addProject = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        student.projects.push(req.body);
        await student.save();

        res.status(201).json({
            success: true,
            message: 'Project added successfully',
            data: student.projects[student.projects.length - 1]
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update project
// @route   PUT /api/students/profile/projects/:id
// @access  Private (Student only)
exports.updateProject = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        const project = student.projects.id(req.params.id);

        if (!project) {
            return next(new ErrorResponse('Project not found', 404));
        }

        Object.assign(project, req.body);
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Project updated successfully',
            data: project
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete project
// @route   DELETE /api/students/profile/projects/:id
// @access  Private (Student only)
exports.deleteProject = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        student.projects.pull(req.params.id);
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Project deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add certificate
// @route   POST /api/students/profile/certificates
// @access  Private (Student only)
exports.addCertificate = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        const certificateData = req.body;

        // Add certificate image path if file was uploaded
        if (req.file) {
            certificateData.certificateImage = `/uploads/certificates/${req.file.filename}`;
        }

        student.certificates.push(certificateData);
        await student.save();

        res.status(201).json({
            success: true,
            message: 'Certificate added successfully',
            data: student.certificates[student.certificates.length - 1]
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update certificate
// @route   PUT /api/students/profile/certificates/:id
// @access  Private (Student only)
exports.updateCertificate = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        const certificate = student.certificates.id(req.params.id);

        if (!certificate) {
            return next(new ErrorResponse('Certificate not found', 404));
        }

        // Add certificate image path if file was uploaded
        if (req.file) {
            req.body.certificateImage = `/uploads/certificates/${req.file.filename}`;
        }

        Object.assign(certificate, req.body);
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Certificate updated successfully',
            data: certificate
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete certificate
// @route   DELETE /api/students/profile/certificates/:id
// @access  Private (Student only)
exports.deleteCertificate = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        student.certificates.pull(req.params.id);
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Certificate deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete certificate image
// @route   DELETE /api/students/profile/certificates/:id/image
// @access  Private (Student only)
exports.deleteCertificateImage = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        const certificate = student.certificates.id(req.params.id);
        if (!certificate) {
            return next(new ErrorResponse('Certificate not found', 404));
        }

        // Remove the image path
        certificate.certificateImage = null;
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Certificate image deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update social links
// @route   PUT /api/students/profile/social-links
// @access  Private (Student only)
exports.updateSocialLinks = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        student.socialLinks = {
            ...student.socialLinks,
            ...req.body
        };
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Social links updated successfully',
            data: student.socialLinks
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update profile visibility
// @route   PUT /api/students/profile/visibility
// @access  Private (Student only)
exports.updateProfileVisibility = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        student.isProfilePublic = req.body.isProfilePublic;
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Profile visibility updated successfully',
            data: {
                isProfilePublic: student.isProfilePublic
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload resume
// @route   POST /api/students/profile/resume
// @access  Private (Student only)
exports.uploadResume = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        if (!req.file) {
            return next(new ErrorResponse('Please upload a file', 400));
        }

        // Update resume info
        student.resume = {
            url: `/uploads/resumes/${req.file.filename}`,
            uploadedAt: new Date()
        };

        await student.save();

        res.status(200).json({
            success: true,
            message: 'Resume uploaded successfully',
            data: student.resume
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete resume
// @route   DELETE /api/students/profile/resume
// @access  Private (Student only)
exports.deleteResume = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        student.resume = {
            url: null,
            uploadedAt: null
        };

        await student.save();

        res.status(200).json({
            success: true,
            message: 'Resume deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload profile picture
// @route   POST /api/students/profile/avatar
// @access  Private (Student only)
exports.uploadAvatar = async (req, res, next) => {
    try {
        const student = await Student.findOne({
            userId: req.user.id
        });

        if (!student) {
            return next(new ErrorResponse('Student profile not found', 404));
        }

        if (!req.file) {
            return next(new ErrorResponse('Please upload a file', 400));
        }

        // Update profile picture
        student.profilePicture = `/uploads/avatars/${req.file.filename}`;
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Profile picture uploaded successfully',
            data: {
                profilePicture: student.profilePicture
            }
        });
    } catch (error) {
        next(error);
    }
};