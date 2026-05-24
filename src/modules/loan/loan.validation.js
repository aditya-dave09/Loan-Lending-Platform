const Joi = require('joi');

const createLoan = {
  body: Joi.object({
    borrowerEmail: Joi.string().email().required().lowercase().trim().messages({
      'string.email': 'Please provide a valid borrower email',
      'any.required': 'Borrower email is required',
    }),
    principalAmount: Joi.number().min(1000).max(10000000).precision(2).required().messages({
      'number.min': 'Minimum loan amount is ₹1,000',
      'number.max': 'Maximum loan amount is ₹1,00,00,000',
      'any.required': 'Principal amount is required',
    }),
    interestRate: Joi.number().min(0).max(36).precision(2).required().messages({
      'number.min': 'Interest rate cannot be negative',
      'number.max': 'Interest rate cannot exceed 36%',
      'any.required': 'Interest rate is required',
    }),
    tenureMonths: Joi.number().integer().min(1).max(60).required().messages({
      'number.min': 'Tenure must be at least 1 month',
      'number.max': 'Tenure cannot exceed 60 months',
      'any.required': 'Tenure is required',
    }),
    repaymentFrequency: Joi.string()
      .valid('MONTHLY', 'WEEKLY', 'BI_WEEKLY', 'QUARTERLY', 'LUMP_SUM')
      .default('MONTHLY'),
    purpose: Joi.string().max(500).allow('', null).trim(),
    terms: Joi.string().max(5000).allow('', null).trim(),
  }),
};

const updateStatus = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    status: Joi.string()
      .valid('PENDING_SIGNATURES', 'CANCELLED')
      .required()
      .messages({
        'any.only': 'Status can only be updated to PENDING_SIGNATURES or CANCELLED',
        'any.required': 'Status is required',
      }),
  }),
};

const getLoan = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

const listLoans = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(
      'DRAFT', 'PENDING_SIGNATURES', 'ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED', 'DISPUTED',
    ),
    role: Joi.string().valid('LENDER', 'BORROWER'),
  }),
};

module.exports = { createLoan, updateStatus, getLoan, listLoans };
