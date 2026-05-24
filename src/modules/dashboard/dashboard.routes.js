const express = require('express');
const dashboardController = require('./dashboard.controller');
const auth = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', auth, dashboardController.getStats);

module.exports = router;
