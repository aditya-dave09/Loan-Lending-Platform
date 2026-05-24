const Joi = require('joi');

const updateProfile = {
  body: Joi.object({
    firstName: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).trim().messages({
      'string.min': 'First name must be at least 2 characters',
      'string.pattern.base': 'First name must contain only letters',
    }),
    lastName: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).trim().messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.pattern.base': 'Last name must contain only letters',
    }),
    dateOfBirth: Joi.date().max('now').messages({
      'date.max': 'Date of birth cannot be in the future',
    }),
    address: Joi.string().max(500).allow('', null).trim(),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field is required for update',
    }),
};

module.exports = {
  updateProfile,
};
