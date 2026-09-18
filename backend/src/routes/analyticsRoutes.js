const express = require('express');
const {
    getMyStudentAnalytics,
    getStudentAnalytics,
    getCompanyAnalytics,
    getTopPerformers,
    getAdminAnalytics
} = require('../controllers/analyticsController');

const { protect, authorize } = require('../middleware/auth');
const { validateAnalyticsQuery, validateTopPerformersQuery } = require('../middleware/validation');

const router = express.Router();

router.use(protect);

// Read-only. `authorize()` rules out roles that can never reach an endpoint;
// who may see one student's analytics depends on the viewer's relationship to
// that student, so that check lives in the controller (Module 10's rule).

router.get('/student', authorize('student'), validateAnalyticsQuery, getMyStudentAnalytics);
router.get('/students/:studentId', validateAnalyticsQuery, getStudentAnalytics);
router.get('/company/top-performers', authorize('company'), validateTopPerformersQuery, getTopPerformers);
router.get('/company', authorize('company'), validateAnalyticsQuery, getCompanyAnalytics);
router.get('/admin', authorize('admin'), validateAnalyticsQuery, getAdminAnalytics);

module.exports = router;
