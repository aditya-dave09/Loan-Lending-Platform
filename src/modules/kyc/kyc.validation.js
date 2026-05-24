const Joi = require('joi');

const submitKyc = {
  body: Joi.object({
    documentType: Joi.string()
      .valid('AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID')
      .required()
      .messages({
        'any.only': 'Document type must be one of: AADHAAR, PAN, PASSPORT, DRIVING_LICENSE, VOTER_ID',
        'any.required': 'Document type is required',
      }),
    documentNumber: Joi.string().min(4).max(30).required().trim().messages({
      'string.min': 'Document number must be at least 4 characters',
      'any.required': 'Document number is required',
    }),
  }),
};

const verifyKyc = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    status: Joi.string().valid('VERIFIED', 'REJECTED').required().messages({
      'any.only': 'Status must be VERIFIED or REJECTED',
      'any.required': 'Status is required',
    }),
    rejectionReason: Joi.string().max(500).when('status', {
      is: 'REJECTED',
      then: Joi.required().messages({ 'any.required': 'Rejection reason is required when rejecting' }),
      otherwise: Joi.optional().allow(null, ''),
    }),
  }),
};

module.exports = { submitKyc, verifyKyc };
