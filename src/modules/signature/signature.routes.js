const express = require('express');
const signatureController = require('./signature.controller');
const auth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const signatureValidation = require('./signature.validation');

const router = express.Router();

/**
 * @swagger
 * /loans/{id}/sign/request-otp:
 *   post:
 *     summary: Request OTP for signing a loan agreement
 *     tags: [Signatures]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/sign/request-otp',
  auth,
  validate(signatureValidation.requestOTP),
  signatureController.requestOTP,
);

/**
 * @swagger
 * /loans/{id}/sign/verify:
 *   post:
 *     summary: Verify OTP and sign the agreement
 *     tags: [Signatures]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  '/:id/sign/verify',
  auth,
  validate(signatureValidation.verifyOTP),
  signatureController.verifyAndSign,
);

module.exports = router;
