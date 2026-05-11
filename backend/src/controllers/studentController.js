const {
    User,
    Student,
    StudentEducation,
    StudentSkill,
    StudentExperience,
    StudentProject,
    StudentCertificate,
    recalcStudentCompletion
} = require('../models');
const ErrorResponse = require('../utils/errorResponse');

const studentIncludes = () => ([
    { model: StudentEducation, as: 'education' },
    { model: StudentSkill, as: 'skills' },
    { model: StudentExperience, as: 'experience' },
    { model: StudentProject, as: 'projects' },
    { model: StudentCertificate, as: 'certificates' }
]);

const findStudentByUser = (userId) =>
    Student.findOne({ where: { userId }, include: studentIncludes() });

const reloadWithChildren = (student) =>
    student.reload({ include: studentIncludes() });

// @desc    Get student profile
exports.getProfile = async (req, res, next) => {
    try {
        const student = await findStudentByUser(req.user.id);
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const user = await User.findByPk(req.user.id);

        res.status(200).json({
            success: true,
            data: { ...student.toJSON(), email: user.email }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all public students
exports.getPublicStudents = async (req, res, next) => {
    try {
        const students = await Student.findAll({
            where: { isProfilePublic: true },
            attributes: [
                'id', 'firstName', 'lastName', 'profilePicture', 'headline',
                'locationCity', 'locationState', 'locationCountry', 'createdAt'
            ],
            include: [{ model: StudentSkill, as: 'skills' }]
        });

        res.status(200).json({
            success: true,
            count: students.length,
            data: students.map((s) => s.toJSON())
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get public student profile by ID
exports.getPublicProfile = async (req, res, next) => {
    try {
        const student = await Student.findByPk(req.params.studentId, { include: studentIncludes() });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));
        if (!student.isProfilePublic) return next(new ErrorResponse('This profile is private', 403));

        const data = student.toJSON();
        const publicProfile = {
            _id: data._id,
            firstName: data.firstName,
            lastName: data.lastName,
            profilePicture: data.profilePicture,
            headline: data.headline,
            bio: data.bio,
            location: data.location,
            education: data.education,
            skills: data.skills,
            experience: data.experience,
            projects: data.projects,
            certificates: data.certificates,
            socialLinks: data.socialLinks,
            profileCompletion: data.profileCompletion,
            isProfilePublic: data.isProfilePublic,
            stats: data.stats,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
        };

        res.status(200).json({ success: true, data: publicProfile });
    } catch (error) {
        next(error);
    }
};

// @desc    Update basic profile info
exports.updateBasicInfo = async (req, res, next) => {
    try {
        const { firstName, lastName, headline, phone, dateOfBirth, bio, location } = req.body;

        const student = await findStudentByUser(req.user.id);
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        if (firstName) student.firstName = firstName;
        if (lastName) student.lastName = lastName;
        if (headline !== undefined) student.headline = headline;
        if (phone !== undefined) student.phone = phone;
        if (dateOfBirth !== undefined) student.dateOfBirth = dateOfBirth;
        if (bio !== undefined) student.bio = bio;
        if (location) {
            if (location.city !== undefined) student.locationCity = location.city;
            if (location.state !== undefined) student.locationState = location.state;
            if (location.country !== undefined) student.locationCountry = location.country;
        }

        await student.save();
        await recalcStudentCompletion(student);
        await reloadWithChildren(student);

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: student.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add education
exports.addEducation = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const education = await StudentEducation.create({ ...req.body, studentId: student.id });
        await recalcStudentCompletion(student);

        res.status(201).json({
            success: true,
            message: 'Education added successfully',
            data: education.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update education
exports.updateEducation = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const education = await StudentEducation.findOne({
            where: { id: req.params.id, studentId: student.id }
        });
        if (!education) return next(new ErrorResponse('Education not found', 404));

        await education.update(req.body);

        res.status(200).json({
            success: true,
            message: 'Education updated successfully',
            data: education.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete education
exports.deleteEducation = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const deleted = await StudentEducation.destroy({
            where: { id: req.params.id, studentId: student.id }
        });

        if (!deleted) return next(new ErrorResponse('Education not found', 404));
        await recalcStudentCompletion(student);

        res.status(200).json({ success: true, message: 'Education deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Add skill
exports.addSkill = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const skill = await StudentSkill.create({ ...req.body, studentId: student.id });
        await recalcStudentCompletion(student);

        res.status(201).json({
            success: true,
            message: 'Skill added successfully',
            data: skill.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update skill
exports.updateSkill = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const skill = await StudentSkill.findOne({
            where: { id: req.params.id, studentId: student.id }
        });
        if (!skill) return next(new ErrorResponse('Skill not found', 404));

        await skill.update(req.body);

        res.status(200).json({
            success: true,
            message: 'Skill updated successfully',
            data: skill.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete skill
exports.deleteSkill = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const deleted = await StudentSkill.destroy({
            where: { id: req.params.id, studentId: student.id }
        });
        if (!deleted) return next(new ErrorResponse('Skill not found', 404));
        await recalcStudentCompletion(student);

        res.status(200).json({ success: true, message: 'Skill deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Add experience
exports.addExperience = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const experience = await StudentExperience.create({ ...req.body, studentId: student.id });
        await recalcStudentCompletion(student);

        res.status(201).json({
            success: true,
            message: 'Experience added successfully',
            data: experience.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update experience
exports.updateExperience = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const experience = await StudentExperience.findOne({
            where: { id: req.params.id, studentId: student.id }
        });
        if (!experience) return next(new ErrorResponse('Experience not found', 404));

        await experience.update(req.body);

        res.status(200).json({
            success: true,
            message: 'Experience updated successfully',
            data: experience.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete experience
exports.deleteExperience = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const deleted = await StudentExperience.destroy({
            where: { id: req.params.id, studentId: student.id }
        });
        if (!deleted) return next(new ErrorResponse('Experience not found', 404));
        await recalcStudentCompletion(student);

        res.status(200).json({ success: true, message: 'Experience deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Add project
exports.addProject = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const project = await StudentProject.create({ ...req.body, studentId: student.id });
        await recalcStudentCompletion(student);

        res.status(201).json({
            success: true,
            message: 'Project added successfully',
            data: project.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update project
exports.updateProject = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const project = await StudentProject.findOne({
            where: { id: req.params.id, studentId: student.id }
        });
        if (!project) return next(new ErrorResponse('Project not found', 404));

        await project.update(req.body);

        res.status(200).json({
            success: true,
            message: 'Project updated successfully',
            data: project.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete project
exports.deleteProject = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const deleted = await StudentProject.destroy({
            where: { id: req.params.id, studentId: student.id }
        });
        if (!deleted) return next(new ErrorResponse('Project not found', 404));
        await recalcStudentCompletion(student);

        res.status(200).json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Add certificate
exports.addCertificate = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const certificateData = { ...req.body, studentId: student.id };
        if (req.file) {
            certificateData.certificateImage = `/uploads/certificates/${req.file.filename}`;
        }

        const certificate = await StudentCertificate.create(certificateData);

        res.status(201).json({
            success: true,
            message: 'Certificate added successfully',
            data: certificate.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update certificate
exports.updateCertificate = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const certificate = await StudentCertificate.findOne({
            where: { id: req.params.id, studentId: student.id }
        });
        if (!certificate) return next(new ErrorResponse('Certificate not found', 404));

        const updates = { ...req.body };
        if (req.file) updates.certificateImage = `/uploads/certificates/${req.file.filename}`;

        await certificate.update(updates);

        res.status(200).json({
            success: true,
            message: 'Certificate updated successfully',
            data: certificate.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete certificate
exports.deleteCertificate = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const deleted = await StudentCertificate.destroy({
            where: { id: req.params.id, studentId: student.id }
        });
        if (!deleted) return next(new ErrorResponse('Certificate not found', 404));

        res.status(200).json({ success: true, message: 'Certificate deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete certificate image
exports.deleteCertificateImage = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const certificate = await StudentCertificate.findOne({
            where: { id: req.params.id, studentId: student.id }
        });
        if (!certificate) return next(new ErrorResponse('Certificate not found', 404));

        certificate.certificateImage = null;
        await certificate.save();

        res.status(200).json({ success: true, message: 'Certificate image deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Update social links
exports.updateSocialLinks = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        const { linkedin, github, portfolio, twitter } = req.body;
        if (linkedin !== undefined) student.socialLinkedin = linkedin;
        if (github !== undefined) student.socialGithub = github;
        if (portfolio !== undefined) student.socialPortfolio = portfolio;
        if (twitter !== undefined) student.socialTwitter = twitter;

        await student.save();

        res.status(200).json({
            success: true,
            message: 'Social links updated successfully',
            data: {
                linkedin: student.socialLinkedin,
                github: student.socialGithub,
                portfolio: student.socialPortfolio,
                twitter: student.socialTwitter
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update profile visibility
exports.updateProfileVisibility = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        student.isProfilePublic = req.body.isProfilePublic;
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Profile visibility updated successfully',
            data: { isProfilePublic: student.isProfilePublic }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload resume
exports.uploadResume = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));
        if (!req.file) return next(new ErrorResponse('Please upload a file', 400));

        student.resumeUrl = `/uploads/resumes/${req.file.filename}`;
        student.resumeUploadedAt = new Date();
        await student.save();
        await recalcStudentCompletion(student);

        res.status(200).json({
            success: true,
            message: 'Resume uploaded successfully',
            data: { url: student.resumeUrl, uploadedAt: student.resumeUploadedAt }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete resume
exports.deleteResume = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));

        student.resumeUrl = null;
        student.resumeUploadedAt = null;
        await student.save();
        await recalcStudentCompletion(student);

        res.status(200).json({ success: true, message: 'Resume deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// @desc    Upload profile picture
exports.uploadAvatar = async (req, res, next) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) return next(new ErrorResponse('Student profile not found', 404));
        if (!req.file) return next(new ErrorResponse('Please upload a file', 400));

        student.profilePicture = `/uploads/avatars/${req.file.filename}`;
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Profile picture uploaded successfully',
            data: { profilePicture: student.profilePicture }
        });
    } catch (error) {
        next(error);
    }
};
