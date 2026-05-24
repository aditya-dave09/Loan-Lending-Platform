const auditService = require('../../services/audit.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/helpers');

const getLogs = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const { entityType, entityId } = req.query;

  if (!entityType || !entityId) {
    // Return user's own audit logs
    const prisma = require('../../config/database');
    const logs = await prisma.auditLog.findMany({
      where: { actorId: req.user.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const total = await prisma.auditLog.count({ where: { actorId: req.user.id } });

    return res.status(200).json(ApiResponse.paginated(logs, { page, limit, total }));
  }

  const result = await auditService.getEntityLogs(entityType, entityId, { page, limit });
  res.status(200).json(
    ApiResponse.paginated(result.logs, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    }),
  );
});

module.exports = { getLogs };
