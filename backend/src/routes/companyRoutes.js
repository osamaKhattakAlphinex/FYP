const express = require('express');
const router = express.Router();
const {
    getProfile,
    getPublicProfile,
    getPublicCompanies,
    updateBasicInfo,
    updateContactInfo,
    updateSocialLinks,
    updateCulture,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    updateProfileVisibility,
    uploadLogo,
    uploadCoverImage,
    uploadTeamMemberAvatar
} = require('../controllers/companyController');
const {
    protect,
    authorize
} = require('../middleware/auth');
const uploadLogoFile = require('../utils/logoUpload');
const uploadCoverFile = require('../utils/coverUpload');
const uploadAvatarFile = require('../utils/avatarUpload');

// Public routes (no authentication required)
router.get('/public', getPublicCompanies);
router.get('/public/:companyId', getPublicProfile);

// All routes below require authentication and company role
router.use(protect);
router.use(authorize('company'));

// Profile routes
router.get('/profile', getProfile);
router.put('/profile/basic', updateBasicInfo);
router.put('/profile/contact', updateContactInfo);
router.put('/profile/social-links', updateSocialLinks);
router.put('/profile/culture', updateCulture);
router.put('/profile/visibility', updateProfileVisibility);

// Team routes
router.post('/profile/team', addTeamMember);
router.put('/profile/team/:id', updateTeamMember);
router.delete('/profile/team/:id', deleteTeamMember);

// Upload routes
router.post('/profile/logo', uploadLogoFile.single('logo'), uploadLogo);
router.post('/profile/cover', uploadCoverFile.single('cover'), uploadCoverImage);
router.post('/profile/team/avatar', uploadAvatarFile.single('avatar'), uploadTeamMemberAvatar);

module.exports = router;