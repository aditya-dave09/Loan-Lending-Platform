const express = require('express');
const documentController = require('./document.controller');
const auth = require('../../middleware/auth');
const uploadMw = require('../../middleware/upload');

const router = express.Router();

/**
 * @swagger
 * /documents/upload:
 *   post:
 *     summary: Upload a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 */
router.post('/upload', auth, uploadMw.single('file'), documentController.upload);

/**
 * @swagger
 * /documents/{id}:
 *   get:
 *     summary: Download a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', auth, documentController.download);

module.exports = router;
