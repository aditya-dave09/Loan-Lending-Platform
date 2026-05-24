const authService = require('./auth.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  res.status(201).json(ApiResponse.created(user, 'Registration successful'));
});

/**
 * @desc    Login with email and password
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });
  res.status(200).json(ApiResponse.ok(result, 'Login successful'));
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh
 * @access  Public
 */
const refresh = asyncHandler(async (req, res) => {
  const tokens = await authService.refreshToken(req.body.refreshToken, {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });
  res.status(200).json(ApiResponse.ok(tokens, 'Token refreshed'));
});

/**
 * @desc    Logout (revoke refresh token)
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(200).json(ApiResponse.ok(null, 'Logged out successfully'));
});

module.exports = {
  register,
  login,
  refresh,
  logout,
};
