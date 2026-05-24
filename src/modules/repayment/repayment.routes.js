const express = require('express');
const repaymentController = require('./repayment.controller');
const auth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const upload = require('../../middleware/upload');
const repaymentValidation = require('./repayment.validation');

const router = express.Router();

/**
 * @swagger
 * /loans/{id}/repayments:
 *   get:
 *     summary: Get repayment schedule and summary for a loan
 *     tags: [Repayments]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/loans/:id/repayments',
  auth,
  validate(repaymentValidation.getSchedule),
  repaymentController.getSchedule,
);

/**
 * @swagger
 * /repayments/{scheduleId}/pay:
 *   post:
 *     summary: Record a payment for an installment
 *     tags: [Repayments]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/repayments/:scheduleId/pay',
  auth,
  upload.single('proofFile'),
  validate(repaymentValidation.recordPayment),
  repaymentController.recordPayment,
);

module.exports = router;
