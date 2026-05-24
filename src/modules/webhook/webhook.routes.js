const express = require('express');
const webhookController = require('./webhook.controller');
const auth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const Joi = require('joi');

const router = express.Router();

const createValidation = {
  body: Joi.object({
    url: Joi.string().uri().required().messages({ 'any.required': 'Webhook URL is required' }),
    events: Joi.array()
      .items(
        Joi.string().valid(
          'LOAN_CREATED', 'LOAN_SIGNED', 'LOAN_ACTIVATED', 'LOAN_COMPLETED',
          'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'KYC_VERIFIED',
        ),
      )
      .min(1)
      .required(),
    secret: Joi.string().min(16).max(256).optional(),
  }),
};

/**
 * @swagger
 * /webhooks:
 *   post:
 *     summary: Register a webhook endpoint
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', auth, validate(createValidation), webhookController.create);

/**
 * @swagger
 * /webhooks:
 *   get:
 *     summary: List your webhook endpoints
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', auth, webhookController.list);

/**
 * @swagger
 * /webhooks/{id}:
 *   delete:
 *     summary: Delete a webhook endpoint
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', auth, webhookController.remove);

module.exports = router;
