const express = require('express');
const {
    getProgressForApplication,
    getProgress,
    updateProgress,
    updateProgressStatus,
    completeProgress,
    getStudentProgress,
    getCompanyProgress,
    getMentorProgress,
    getProgressOverview,
    getProgressReport,
    getMilestones,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    reorderMilestones,
    startMilestone,
    submitMilestone,
    reviewMilestone,
    setMilestoneStatus,
    getMilestoneSubmissions,
    getPendingSubmissions,
    getTimeLogs,
    createTimeLog,
    updateTimeLog,
    deleteTimeLog,
    getUpdates,
    createUpdate,
    updateUpdate,
    resolveUpdate,
    deleteUpdate
} = require('../controllers/progressController');

const { protect, authorize } = require('../middleware/auth');
const {
    validateProgressPlanUpdate,
    validateProgressStatusChange,
    validateProgressCompletion,
    validateMilestoneCreate,
    validateMilestoneUpdate,
    validateMilestoneReorder,
    validateMilestoneSubmission,
    validateMilestoneReview,
    validateMilestoneStatusChange,
    validateTimeLog,
    validateTimeLogUpdate,
    validateProgressUpdate,
    validateProgressUpdateEdit,
    validateUpdateResolution
} = require('../middleware/validation');

const router = express.Router();

router.use(protect);

// Fine-grained authorisation lives in the controller, because for a mentor it
// depends on holding an assignment on *this* internship, not on their role.
// `authorize()` here only rules out roles that can never reach an endpoint.

// --- Role dashboards -----------------------------------------------------
// Literal paths first so they are not swallowed by /:id.
router.get('/overview', getProgressOverview);
router.get('/student', authorize('student'), getStudentProgress);
router.get('/company', authorize('company'), getCompanyProgress);
router.get('/mentor', authorize('mentor'), getMentorProgress);

// --- Entry point from an application -------------------------------------
router.get('/applications/:applicationId', getProgressForApplication);

// --- Milestones ----------------------------------------------------------
// The literal /reorder must be declared before /:milestoneId.
router.get('/:id/milestones', getMilestones);
router.post('/:id/milestones', validateMilestoneCreate, createMilestone);
router.put('/:id/milestones/reorder', validateMilestoneReorder, reorderMilestones);
router.get('/:id/milestones/:milestoneId/submissions', getMilestoneSubmissions);
router.put('/:id/milestones/:milestoneId/start', startMilestone);
router.post(
    '/:id/milestones/:milestoneId/submit',
    validateMilestoneSubmission,
    submitMilestone
);
router.put('/:id/milestones/:milestoneId/review', validateMilestoneReview, reviewMilestone);
router.put(
    '/:id/milestones/:milestoneId/status',
    validateMilestoneStatusChange,
    setMilestoneStatus
);
router.put('/:id/milestones/:milestoneId', validateMilestoneUpdate, updateMilestone);
router.delete('/:id/milestones/:milestoneId', deleteMilestone);

// --- Submissions ---------------------------------------------------------
router.get('/:id/submissions', getPendingSubmissions);

// --- Time logs -----------------------------------------------------------
router.get('/:id/time-logs', getTimeLogs);
router.post('/:id/time-logs', validateTimeLog, createTimeLog);
router.put('/:id/time-logs/:logId', validateTimeLogUpdate, updateTimeLog);
router.delete('/:id/time-logs/:logId', deleteTimeLog);

// --- Updates / check-ins / blockers --------------------------------------
router.get('/:id/updates', getUpdates);
router.post('/:id/updates', validateProgressUpdate, createUpdate);
router.put('/:id/updates/:updateId/resolve', validateUpdateResolution, resolveUpdate);
router.put('/:id/updates/:updateId', validateProgressUpdateEdit, updateUpdate);
router.delete('/:id/updates/:updateId', deleteUpdate);

// --- Whole-internship actions -------------------------------------------
router.get('/:id/report', getProgressReport);
router.put('/:id/status', validateProgressStatusChange, updateProgressStatus);
router.put('/:id/complete', validateProgressCompletion, completeProgress);
router.put('/:id', validateProgressPlanUpdate, updateProgress);
router.get('/:id', getProgress);

module.exports = router;
