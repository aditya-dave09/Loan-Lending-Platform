const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

/**
 * Global error handling middleware.
 * Must be registered LAST in the middleware chain.
 *
 * Handles:
 * - Custom ApiError instances
 * - Prisma errors (unique constraint, not found)
 * - Multer file upload errors
 * - JWT errors
 * - Unknown/unhandled errors
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  // ── Prisma Errors ──────────────────────────
  if (err.code === 'P2002') {
    statusCode = 409;
    const field = err.meta?.target?.[0] || 'field';
    message = `A record with this ${field} already exists`;
    errors = [{ field, message }];
  }

  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
  }

  // ── Multer Errors ──────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File size exceeds the maximum limit of 5MB';
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected file field';
  }

  // ── Log Error ──────────────────────────────
  if (statusCode >= 500) {
    logger.error('Unhandled Error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      requestId: req.id,
    });
  } else {
    logger.warn('Client Error:', {
      statusCode,
      message,
      url: req.originalUrl,
      method: req.method,
      requestId: req.id,
    });
  }

  // ── Send Response ──────────────────────────
  const response = {
    success: false,
    message,
  };

  if (errors.length > 0) {
    response.errors = errors;
  }

  // Include stack trace in development only
  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
