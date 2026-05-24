const express = require('express');
const kycController = require('./kyc.controller');
const auth = require('../../middleware/auth');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const upload = require('../../middleware/upload');
const kycValidation = require('./kyc.validation');

const router = express.Router();

/**
 * @swagger
 * /kyc/submit:
 *   post:
 *     summary: Submit KYC documents for verification
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [documentType, documentNumber, documentFile]
 *             properties:
 *               documentType:
 *                 type: string
 *                 enum: [AADHAAR, PAN, PASSPORT, DRIVING_LICENSE, VOTER_ID]
 *               documentNumber:
 *                 type: string
 *               documentFile:
 *                 type: string
 *                 format: binary
 *               selfieFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: KYC submitted for verification
 */
router.post(
  '/submit',
  auth,
  upload.fields([
    { name: 'documentFile', maxCount: 1 },
    { name: 'selfieFile', maxCount: 1 },
  ]),
  validate(kycValidation.submitKyc),
  kycController.submit,
);

/**
 * @swagger
 * /kyc/status:
 *   get:
 *     summary: Check your KYC verification status
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC status
 */
router.get('/status', auth, kycController.getStatus);

/**
 * @swagger
 * /kyc/pending:
 *   get:
 *     summary: "Admin: List all pending KYC submissions"
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending KYC submissions
 */
router.get('/pending', auth, authorize('ADMIN'), kycController.listPending);

/**
 * @swagger
 * /kyc/{id}/verify:
 *   patch:
 *     summary: "Admin: Approve or reject a KYC submission"
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [VERIFIED, REJECTED]
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: KYC verified or rejected
 */
router.patch(
  '/:id/verify',
  auth,
  authorize('ADMIN'),
  validate(kycValidation.verifyKyc),
  kycController.verify,
);

module.exports = router;
