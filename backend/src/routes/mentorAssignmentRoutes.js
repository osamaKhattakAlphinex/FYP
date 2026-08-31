const express = require('express');
const {
    getMentorSuggestions,
    getAssignmentsForApplication,
    assignMentor,
    cancelAssignment,
    getCompanyAssignments,
    getUnassignedInternships,
    getMyAssignments,
    respondToAssignment,
    completeAssignment,
    getStudentAssignments,
    rateMentor,
    getAssignment,
    getNotes,
    addNote,
    updateNote,
    deleteNote
} = require('../controllers/mentorAssignmentController');

const { protect, authorize } = require('../middleware/auth');
const {
    validateMentorAssignment,
    validateAssignmentResponse,
    validateMentorNote,
    validateMentorshipRating,
    validateMentorshipCompletion
} = require('../middleware/validation');

const router = express.Router();

router.use(protect);

// --- Company -------------------------------------------------------------
router.get(
    '/applications/:applicationId/suggestions',
    authorize('company'),
    getMentorSuggestions
);
// Every assignment (current + declined history) for one application.
// Declared before the generic POST below only for readability — Express
// does not care about ordering here since the two templates differ.
router.get(
    '/applications/:applicationId',
    authorize('company', 'student', 'admin'),
    getAssignmentsForApplication
);
router.post(
    '/applications/:applicationId',
    authorize('company'),
    validateMentorAssignment,
    assignMentor
);
router.get('/company', authorize('company'), getCompanyAssignments);
router.get('/company/unassigned', authorize('company'), getUnassignedInternships);

// --- Mentor --------------------------------------------------------------
router.get('/me', authorize('mentor'), getMyAssignments);

// --- Student -------------------------------------------------------------
router.get('/student', authorize('student'), getStudentAssignments);

// --- Per-assignment actions ---------------------------------------------
// Literal paths above, parameterised ones below, so /company and /me are not
// swallowed by /:id.
router.put('/:id/respond', authorize('mentor'), validateAssignmentResponse, respondToAssignment);
router.put('/:id/complete', authorize('mentor', 'admin'), validateMentorshipCompletion, completeAssignment);
router.put('/:id/cancel', authorize('company', 'admin'), cancelAssignment);
router.put('/:id/rate', authorize('student'), validateMentorshipRating, rateMentor);

// Guidance notes — the controller checks that the caller is on this assignment.
router.get('/:id/notes', getNotes);
router.post('/:id/notes', validateMentorNote, addNote);
router.put('/:id/notes/:noteId', updateNote);
router.delete('/:id/notes/:noteId', deleteNote);

router.get('/:id', getAssignment);

module.exports = router;
