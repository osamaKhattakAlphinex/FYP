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
    trackTaskView
} = require('../controllers/taskController');

const {
    protect,
    authorize
} = require('../middleware/auth');
const {
    validateTaskCreation,
    validateTaskUpdate
} = require('../middleware/validation');

const router = express.Router();

// Public routes
router.get('/', getTasks);
router.get('/stats', getTaskStats);
router.post('/search', searchTasks);
router.get('/:id', getTask);

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

module.exports = router;