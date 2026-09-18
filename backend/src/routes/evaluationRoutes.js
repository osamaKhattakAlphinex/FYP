const express = require('express');
const {
    verifyEvaluation,
    getStudentEvaluations,
    getCompanyEvaluations,
    getMentorEvaluations,
    getTaskCriteria,
    replaceTaskCriteria,
    getEvaluationForProgress,
    generateForProgress,
    updateEvaluation,
    finalizeEvaluation,
    reopenEvaluation
} = require('../controllers/evaluationController');

const { protect, authorize } = require('../middleware/auth');
const {
    validateEvaluationCriteria,
    validateEvaluationUpdate,
    validateEvaluationReopen
} = require('../middleware/validation');

const router = express.Router();

// --- Public ------------------------------------------------------------------
// Declared before `protect` so a third party (an employer checking a CV) can
// confirm a finalized result by its code without an account.
router.get('/verify/:code', verifyEvaluation);

router.use(protect);

// Fine-grained authorisation lives in the controller, because for a mentor it
// depends on holding an assignment on *this* internship, not on their role.
// `authorize()` here only rules out roles that can never reach an endpoint.

// --- Role lists (literal paths before /:id) ------------------------------------
router.get('/student', authorize('student'), getStudentEvaluations);
router.get('/company', authorize('company'), getCompanyEvaluations);
router.get('/mentor', authorize('mentor'), getMentorEvaluations);

// --- Rubric --------------------------------------------------------------------
router.get('/tasks/:taskId/criteria', authorize('company', 'admin'), getTaskCriteria);
router.put(
    '/tasks/:taskId/criteria',
    authorize('company', 'admin'),
    validateEvaluationCriteria,
    replaceTaskCriteria
);

// --- One internship ------------------------------------------------------------
router.get('/progress/:progressId', getEvaluationForProgress);
router.post(
    '/progress/:progressId/generate',
    authorize('company', 'mentor', 'admin'),
    generateForProgress
);

// --- One evaluation --------------------------------------------------------------
router.put('/:id/finalize', authorize('company', 'mentor', 'admin'), finalizeEvaluation);
router.put('/:id/reopen', authorize('admin'), validateEvaluationReopen, reopenEvaluation);
router.put('/:id', authorize('company', 'mentor', 'admin'), validateEvaluationUpdate, updateEvaluation);

module.exports = router;
