const prisma = require('../config/database');

/**
 * Audit log service — records immutable event history.
 *
 * Usage:
 *   const auditService = require('../services/audit.service');
 *   await auditService.log({
 *     entityType: 'LOAN',
 *     entityId: loan.id,
 *     action: 'CREATE',
 *     actorId: req.user.id,
 *     newValues: loan,
 *     ipAddress: req.ip,
 *     userAgent: req.headers['user-agent'],
 *   });
 */
class AuditService {
  /**
   * Create an immutable audit log entry.
   *
   * @param {object} params
   * @param {string} params.entityType - e.g., 'USER', 'LOAN', 'PAYMENT'
   * @param {string} params.entityId - UUID of the entity
   * @param {string} params.action - AuditAction enum value
   * @param {string} [params.actorId] - User who performed the action
   * @param {object} [params.oldValues] - State before the change
   * @param {object} [params.newValues] - State after the change
   * @param {string} [params.ipAddress] - Client IP
   * @param {string} [params.userAgent] - Client user agent
   * @param {object} [params.metadata] - Additional context
   */
  async log({ entityType, entityId, action, actorId, oldValues, newValues, ipAddress, userAgent, metadata }) {
    try {
      await prisma.auditLog.create({
        data: {
          entityType,
          entityId,
          action,
          actorId,
          oldValues: oldValues || undefined,
          newValues: newValues || undefined,
          ipAddress,
          userAgent,
          metadata: metadata || undefined,
        },
      });
    } catch (error) {
      // Audit logging should never break the main flow
      // eslint-disable-next-line no-console
      console.error('Failed to write audit log:', error.message);
    }
  }

  /**
   * Get audit logs for a specific entity.
   */
  async getEntityLogs(entityType, entityId, { page = 1, limit = 50 } = {}) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { entityType, entityId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          actor: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.auditLog.count({ where: { entityType, entityId } }),
    ]);

    return { logs, total, page, limit };
  }
}

module.exports = new AuditService();
