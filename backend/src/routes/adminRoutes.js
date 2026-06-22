const express = require('express');
const axios = require('axios');

const { protect, authorize } = require('../middleware/auth');
const aiService = require('../services/aiService');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

// GET /api/admin/ai-health
// Returns a snapshot from the in-memory ring buffer so an admin can see whether
// the AI matching service is healthy without us standing up Prometheus yet.
router.get('/ai-health', async (req, res, next) => {
    try {
        const snapshot = aiService.getAIHealth();

        // Best-effort live probe (skipped if the buffer already shows recent activity).
        let livenessChecked = false;
        if (!snapshot.reachable && req.query.probe !== 'false') {
            livenessChecked = true;
            const url = (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
            try {
                await axios.get(`${url}/health`, { timeout: 2000 });
                snapshot.reachable = true;
            } catch (e) {
                snapshot.reachable = false;
                snapshot.probeError = (e && (e.code || e.message)) || 'unreachable';
            }
        }

        res.status(200).json({
            success: true,
            data: { ...snapshot, livenessChecked }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
