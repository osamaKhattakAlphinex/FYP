const express = require('express');
const {
    getProfile,
    updateProfile,
    updateAvailability,
    updateProfileVisibility,
    uploadAvatar,
    addExpertise,
    updateExpertise,
    deleteExpertise,
    getMentorStats,
    getPublicMentors,
    getPublicMentor
} = require('../controllers/mentorController');

const { protect, authorize } = require('../middleware/auth');
const {
    validateMentorProfileUpdate,
    validateMentorExpertise,
    validateMentorAvailability
} = require('../middleware/validation');
const uploadAvatarFile = require('../utils/avatarUpload');

const router = express.Router();

// Public directory — declared before `protect`, matching studentRoutes/companyRoutes.
router.get('/public', getPublicMentors);
router.get('/public/:mentorId', getPublicMentor);

router.use(protect);

// Per-route authorize rather than a blanket router.use(authorize('mentor')),
// so this router can also serve company/admin readers later.
router.get('/me', authorize('mentor'), getProfile);
router.put('/me', authorize('mentor'), validateMentorProfileUpdate, updateProfile);
router.get('/me/stats', authorize('mentor'), getMentorStats);
router.put('/me/availability', authorize('mentor'), validateMentorAvailability, updateAvailability);
router.put('/me/visibility', authorize('mentor'), updateProfileVisibility);
router.post('/me/avatar', authorize('mentor'), uploadAvatarFile.single('avatar'), uploadAvatar);

router.post('/me/expertise', authorize('mentor'), validateMentorExpertise, addExpertise);
router.put('/me/expertise/:expertiseId', authorize('mentor'), updateExpertise);
router.delete('/me/expertise/:expertiseId', authorize('mentor'), deleteExpertise);

module.exports = router;
