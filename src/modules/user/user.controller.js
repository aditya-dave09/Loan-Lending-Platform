const prisma = require('../../config/database');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

/**
 * @desc    Get current user's profile
 * @route   GET /api/v1/users/me
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      address: true,
      role: true,
      kycStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(200).json(ApiResponse.ok(user));
});

/**
 * @desc    Update current user's profile
 * @route   PATCH /api/v1/users/me
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, dateOfBirth, address } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
      ...(address !== undefined && { address }),
    },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      address: true,
      role: true,
      kycStatus: true,
      updatedAt: true,
    },
  });

  res.status(200).json(ApiResponse.ok(user, 'Profile updated'));
});

module.exports = {
  getProfile,
  updateProfile,
};
