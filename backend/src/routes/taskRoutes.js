const express = require('express');
const {
    getTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    getMyTasks,
    getTaskStats,
    searchTasks,
    getRecommendedTasks,
    trackTaskView,
    recomputeMatchesForTask
} = require('../controllers/taskController');

const {
    protect,
    optionalAuth,
    authorize
} = require('../middleware/auth');
const {
    validateTaskCreation,
    validateTaskUpdate
} = require('../middleware/validation');

const router = express.Router();

// Public routes (optionalAuth: personalise with AI match scores when logged in)
router.get('/', optionalAuth, getTasks);
router.get('/stats', getTaskStats);
router.post('/search', searchTasks);
router.get('/:id', optionalAuth, getTask);

// Protected routes
router.use(protect);

// View tracking (authenticated users)
router.post('/:id/view', trackTaskView);

// Student routes
router.get('/recommendations', authorize('student'), getRecommendedTasks);

// Company routes
router.post('/', authorize('company'), validateTaskCreation, createTask);
router.get('/company/my-tasks', authorize('company'), getMyTasks);
router.put('/:id', authorize('company'), validateTaskUpdate, updateTask);
router.delete('/:id', authorize('company'), deleteTask);
router.post('/:id/recompute-matches', authorize('company'), recomputeMatchesForTask);

module.exports = router;