const Joi = require('joi');

const getSchedule = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

const recordPayment = {
  params: Joi.object({
    scheduleId: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    amountPaid: Joi.number().positive().precision(2).required().messages({
      'number.positive': 'Payment amount must be positive',
      'any.required': 'Payment amount is required',
    }),
    paymentMethod: Joi.string()
      .valid('UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'OTHER')
      .required()
      .messages({
        'any.only': 'Payment method must be UPI, BANK_TRANSFER, CASH, CHEQUE, or OTHER',
        'any.required': 'Payment method is required',
      }),
    transactionRef: Joi.string().max(100).allow('', null).trim(),
    notes: Joi.string().max(500).allow('', null).trim(),
  }),
};

module.exports = { getSchedule, recordPayment };
