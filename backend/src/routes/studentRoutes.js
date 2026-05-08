const express = require('express');
const router = express.Router();
const {
    getProfile,
    getPublicProfile,
    getPublicStudents,
    updateBasicInfo,
    addEducation,
    updateEducation,
    deleteEducation,
    addSkill,
    updateSkill,
    deleteSkill,
    addExperience,
    updateExperience,
    deleteExperience,
    addProject,
    updateProject,
    deleteProject,
    addCertificate,
    updateCertificate,
    deleteCertificate,
    deleteCertificateImage,
    updateSocialLinks,
    updateProfileVisibility,
    uploadResume,
    deleteResume,
    uploadAvatar
} = require('../controllers/studentController');
const {
    protect,
    authorize
} = require('../middleware/auth');
const upload = require('../utils/fileUpload');
const uploadResumeFile = require('../utils/resumeUpload');
const uploadAvatarFile = require('../utils/avatarUpload');

// Public routes (no authentication required)
router.get('/public', getPublicStudents);
router.get('/public/:studentId', getPublicProfile);

// All routes below require authentication and student role
router.use(protect);
router.use(authorize('student'));

// Profile routes
router.get('/profile', getProfile);
router.put('/profile/basic', updateBasicInfo);
router.put('/profile/social-links', updateSocialLinks);
router.put('/profile/visibility', updateProfileVisibility);

// Education routes
router.post('/profile/education', addEducation);
router.put('/profile/education/:id', updateEducation);
router.delete('/profile/education/:id', deleteEducation);

// Skills routes
router.post('/profile/skills', addSkill);
router.put('/profile/skills/:id', updateSkill);
router.delete('/profile/skills/:id', deleteSkill);

// Experience routes
router.post('/profile/experience', addExperience);
router.put('/profile/experience/:id', updateExperience);
router.delete('/profile/experience/:id', deleteExperience);

// Projects routes
router.post('/profile/projects', addProject);
router.put('/profile/projects/:id', updateProject);
router.delete('/profile/projects/:id', deleteProject);

// Certificates routes
router.post('/profile/certificates', upload.single('certificateImage'), addCertificate);
router.put('/profile/certificates/:id', upload.single('certificateImage'), updateCertificate);
router.delete('/profile/certificates/:id', deleteCertificate);
router.delete('/profile/certificates/:id/image', deleteCertificateImage);

// Resume routes
router.post('/profile/resume', uploadResumeFile.single('resume'), uploadResume);
router.delete('/profile/resume', deleteResume);

// Avatar routes
router.post('/profile/avatar', uploadAvatarFile.single('avatar'), uploadAvatar);

module.exports = router;