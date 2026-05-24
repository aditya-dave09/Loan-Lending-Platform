const Joi = require('joi');

const register = {
  body: Joi.object({
    email: Joi.string().email().required().lowercase().trim().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{9,14}$/)
      .required()
      .messages({
        'string.pattern.base': 'Phone must be a valid number (e.g., +919876543210)',
        'any.required': 'Phone number is required',
      }),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base':
          'Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
        'any.required': 'Password is required',
      }),
    firstName: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).required().trim().messages({
      'string.min': 'First name must be at least 2 characters',
      'string.pattern.base': 'First name must contain only letters',
      'any.required': 'First name is required',
    }),
    lastName: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).required().trim().messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.pattern.base': 'Last name must contain only letters',
      'any.required': 'Last name is required',
    }),
  }),
};

const login = {
  body: Joi.object({
    email: Joi.string().email().required().lowercase().trim().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),
};

const refreshToken = {
  body: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required',
    }),
  }),
};

const logout = {
  body: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required',
    }),
  }),
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
};
