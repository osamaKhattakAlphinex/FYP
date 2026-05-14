const express = require('express');
const {
    applyToTask,
    getMyApplications,
    getMyApplication,
    updateMyApplication,
    withdrawMyApplication,
    getApplicationsForTask,
    getApplication,
    updateApplicationStatus,
    updateCompanyNotes,
    getApplicationStats,
    uploadAttachments
} = require('../controllers/applicationController');
const uploadApplicationAttachment = require('../utils/applicationAttachmentUpload');

const {
    protect,
    authorize
} = require('../middleware/auth');
const {
    validateApplicationCreation,
    validateApplicationUpdate,
    validateApplicationStatusChange
} = require('../middleware/validation');

const router = express.Router();

// All application routes require authentication
router.use(protect);

// Student routes
router.post(
    '/attachments/upload',
    authorize('student'),
    uploadApplicationAttachment.array('files', 8),
    uploadAttachments
);
router.post('/tasks/:taskId', authorize('student'), validateApplicationCreation, applyToTask);
router.get('/me', authorize('student'), getMyApplications);
router.put('/:id', authorize('student'), validateApplicationUpdate, updateMyApplication);
router.post('/:id/withdraw', authorize('student'), withdrawMyApplication);

// Company routes
router.get('/tasks/:taskId', authorize('company'), getApplicationsForTask);
router.get('/company/stats', authorize('company'), getApplicationStats);
router.put('/:id/status', authorize('company'), validateApplicationStatusChange, updateApplicationStatus);
router.put('/:id/notes', authorize('company'), updateCompanyNotes);

// Shared (controller enforces ownership per role)
router.get('/:id', (req, res, next) => {
    if (req.user.role === 'company') return getApplication(req, res, next);
    if (req.user.role === 'student') return getMyApplication(req, res, next);
    return res.status(403).json({ success: false, message: 'Not authorized' });
});

module.exports = router;
