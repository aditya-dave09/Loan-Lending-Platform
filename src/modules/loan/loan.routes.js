const express = require('express');
const loanController = require('./loan.controller');
const auth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const loanValidation = require('./loan.validation');

const router = express.Router();

/**
 * @swagger
 * /loans:
 *   post:
 *     summary: Create a new loan agreement
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', auth, validate(loanValidation.createLoan), loanController.create);

/**
 * @swagger
 * /loans:
 *   get:
 *     summary: List my loan agreements
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', auth, validate(loanValidation.listLoans), loanController.list);

/**
 * @swagger
 * /loans/{id}:
 *   get:
 *     summary: Get loan agreement details
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', auth, validate(loanValidation.getLoan), loanController.getById);

/**
 * @swagger
 * /loans/{id}/status:
 *   patch:
 *     summary: Update loan status
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/status', auth, validate(loanValidation.updateStatus), loanController.updateStatus);

/**
 * @swagger
 * /loans/{id}/verify:
 *   get:
 *     summary: Verify agreement integrity (public)
 *     tags: [Loans]
 */
router.get('/:id/verify', validate(loanValidation.getLoan), loanController.verifyIntegrity);

module.exports = router;
