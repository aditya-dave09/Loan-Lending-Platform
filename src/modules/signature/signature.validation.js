const Joi = require('joi');

const requestOTP = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

const verifyOTP = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      'string.length': 'OTP must be 6 digits',
      'string.pattern.base': 'OTP must contain only digits',
      'any.required': 'OTP is required',
    }),
  }),
};

module.exports = { requestOTP, verifyOTP };
