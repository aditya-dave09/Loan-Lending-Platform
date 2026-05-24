const express = require('express');
const auditController = require('./audit.controller');
const auth = require('../../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /audit/logs:
 *   get:
 *     summary: View audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 */
router.get('/logs', auth, auditController.getLogs);

module.exports = router;
