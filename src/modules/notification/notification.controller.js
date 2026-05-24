const prisma = require('../../config/database');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/helpers');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const unreadOnly = req.query.unreadOnly === 'true';

  const where = {
    userId: req.user.id,
    ...(unreadOnly && { readAt: null }),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  res.status(200).json(ApiResponse.paginated(notifications, { page, limit, total }));
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await prisma.notification.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });

  if (!notification) {
    const ApiError = require('../../utils/ApiError');
    throw ApiError.notFound('Notification not found');
  }

  await prisma.notification.update({
    where: { id: req.params.id },
    data: { readAt: new Date() },
  });

  res.status(200).json(ApiResponse.ok(null, 'Notification marked as read'));
});

const markAllRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  res.status(200).json(ApiResponse.ok(null, 'All notifications marked as read'));
});

module.exports = { list, markRead, markAllRead };
