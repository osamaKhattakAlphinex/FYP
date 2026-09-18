const express = require('express');
const {
    getReceivedFeedback,
    getGivenFeedback,
    getAllFeedback,
    getStudentFeedbackSummary,
    getFeedbackForProgress,
    getFeedbackForInterview,
    assistFeedback,
    createFeedback,
    getFeedback,
    updateFeedback,
    deleteFeedback,
    acknowledgeFeedback
} = require('../controllers/feedbackController');

const { protect, authorize } = require('../middleware/auth');
const {
    validateFeedbackCreate,
    validateFeedbackUpdate,
    validateFeedbackAcknowledge,
    validateFeedbackAssist
} = require('../middleware/validation');

const router = express.Router();

router.use(protect);

// Fine-grained authorisation lives in the controller and the Feedback model,
// because it depends on the actor's relationship to *this* internship or
// interview. `authorize()` here only rules out roles that can never reach an
// endpoint.

// --- Lists and summaries (literal paths before /:id) ---------------------------
router.get('/received', authorize('student'), getReceivedFeedback);
router.get('/given', authorize('company', 'mentor'), getGivenFeedback);
router.get('/students/:studentId/summary', getStudentFeedbackSummary);
router.get('/progress/:progressId', getFeedbackForProgress);
router.get('/interviews/:interviewId', authorize('company', 'student', 'admin'), getFeedbackForInterview);

// --- Authoring -------------------------------------------------------------------
router.post('/assist', authorize('company', 'mentor'), validateFeedbackAssist, assistFeedback);
router.get('/', authorize('admin'), getAllFeedback);
router.post('/', authorize('company', 'mentor'), validateFeedbackCreate, createFeedback);

// --- One record ------------------------------------------------------------------
router.put('/:id/acknowledge', authorize('student'), validateFeedbackAcknowledge, acknowledgeFeedback);
router.get('/:id', getFeedback);
router.put('/:id', authorize('company', 'mentor'), validateFeedbackUpdate, updateFeedback);
router.delete('/:id', authorize('company', 'mentor', 'admin'), deleteFeedback);

module.exports = router;
