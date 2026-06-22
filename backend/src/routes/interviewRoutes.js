const express = require('express');
const {
    scheduleInterview,
    rescheduleInterview,
    cancelInterview,
    completeInterview,
    submitStudentFeedback,
    getMyInterviews,
    getInterview,
    getCompanyInterviewStats
} = require('../controllers/interviewController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All interview routes require authentication
router.use(protect);

// Company-only
router.post('/applications/:applicationId', authorize('company'), scheduleInterview);
router.get('/company/stats', authorize('company'), getCompanyInterviewStats);
router.put('/:id/complete', authorize('company'), completeInterview);

// Student-only
router.put('/:id/feedback', authorize('student'), submitStudentFeedback);

// Either role (controller enforces ownership / permission predicates)
router.get('/me', getMyInterviews);
router.put('/:id/reschedule', rescheduleInterview);
router.put('/:id/cancel', cancelInterview);
router.get('/:id', getInterview);

module.exports = router;
