const ApiError = require('../utils/ApiError');

/**
 * Role-based authorization middleware.
 * Must be used AFTER the auth middleware.
 *
 * Usage:
 *   router.get('/admin', auth, authorize('ADMIN'), controller.adminAction);
 *   router.get('/both', auth, authorize('USER', 'ADMIN'), controller.action);
 *
 * @param  {...string} allowedRoles - Roles that can access this route
 */
const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(`Access denied. Required role: ${allowedRoles.join(' or ')}`),
      );
    }

    next();
  };
};

module.exports = authorize;
