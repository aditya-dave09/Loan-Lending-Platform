const ApiError = require('../utils/ApiError');

/**
 * Request validation middleware using Joi schemas.
 * Validates body, query, and/or params against provided schemas.
 *
 * Usage:
 *   const schema = { body: Joi.object({ email: Joi.string().email().required() }) };
 *   router.post('/login', validate(schema), controller.login);
 *
 * @param {object} schema - Object with optional 'body', 'query', 'params' Joi schemas
 */
const validate = (schema) => {
  return (req, _res, next) => {
    const errors = [];

    ['body', 'query', 'params'].forEach((source) => {
      if (schema[source]) {
        const { error, value } = schema[source].validate(req[source], {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        });

        if (error) {
          error.details.forEach((detail) => {
            errors.push({
              field: detail.path.join('.'),
              message: detail.message.replace(/"/g, ''),
            });
          });
        } else {
          // Replace with validated + sanitized values
          req[source] = value;
        }
      }
    });

    if (errors.length > 0) {
      return next(ApiError.validation(errors));
    }

    next();
  };
};

module.exports = validate;
