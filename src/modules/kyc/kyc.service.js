const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const auditService = require('../../services/audit.service');
const { fileChecksum } = require('../../utils/helpers');
const fs = require('fs');

class KycService {
  /**
   * Submit KYC documents for verification.
   */
  async submit({ documentType, documentNumber, documentFile, selfieFile, userId }) {
    // Check if user already has a KYC submission
    const existing = await prisma.kycVerification.findUnique({
      where: { userId },
    });

    if (existing && existing.verifiedAt) {
      throw ApiError.conflict('KYC is already verified');
    }

    // Store document file reference
    let documentFileRecord = null;
    if (documentFile) {
      const buffer = fs.readFileSync(documentFile.path);
      documentFileRecord = await prisma.document.create({
        data: {
          fileName: documentFile.filename,
          originalName: documentFile.originalname,
          mimeType: documentFile.mimetype,
          fileSize: documentFile.size,
          filePath: documentFile.path,
          purpose: 'KYC_DOCUMENT',
          uploadedBy: userId,
          checksum: fileChecksum(buffer),
        },
      });
    }

    // Store selfie file reference
    let selfieFileRecord = null;
    if (selfieFile) {
      const buffer = fs.readFileSync(selfieFile.path);
      selfieFileRecord = await prisma.document.create({
        data: {
          fileName: selfieFile.filename,
          originalName: selfieFile.originalname,
          mimeType: selfieFile.mimetype,
          fileSize: selfieFile.size,
          filePath: selfieFile.path,
          purpose: 'IDENTITY_PHOTO',
          uploadedBy: userId,
          checksum: fileChecksum(buffer),
        },
      });
    }

    // Upsert KYC record
    const kyc = await prisma.kycVerification.upsert({
      where: { userId },
      update: {
        documentType,
        documentNumber,
        documentFileId: documentFileRecord?.id || undefined,
        selfieFileId: selfieFileRecord?.id || undefined,
        rejectionReason: null,
        verifiedAt: null,
        verifiedBy: null,
      },
      create: {
        userId,
        documentType,
        documentNumber,
        documentFileId: documentFileRecord?.id,
        selfieFileId: selfieFileRecord?.id,
      },
    });

    // Update user KYC status
    await prisma.user.update({
      where: { id: userId },
      data: { kycStatus: 'PENDING' },
    });

    // Audit log
    await auditService.log({
      entityType: 'KYC',
      entityId: kyc.id,
      action: 'CREATE',
      actorId: userId,
      newValues: { documentType, documentNumber },
    });

    return {
      id: kyc.id,
      documentType: kyc.documentType,
      status: 'PENDING',
      submittedAt: kyc.createdAt,
    };
  }

  /**
   * Get KYC status for the current user.
   */
  async getStatus(userId) {
    const kyc = await prisma.kycVerification.findUnique({
      where: { userId },
      select: {
        id: true,
        documentType: true,
        documentNumber: true,
        rejectionReason: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true },
    });

    return {
      status: user.kycStatus,
      ...(kyc && {
        documentType: kyc.documentType,
        documentNumber: kyc.documentNumber.replace(/.(?=.{4})/g, '*'), // Mask all but last 4 chars
        rejectionReason: kyc.rejectionReason,
        verifiedAt: kyc.verifiedAt,
        submittedAt: kyc.createdAt,
      }),
    };
  }

  /**
   * Admin: verify or reject KYC submission.
   */
  async verify({ kycId, status, rejectionReason, adminId, ipAddress, userAgent }) {
    const kyc = await prisma.kycVerification.findUnique({
      where: { id: kycId },
      include: { user: true },
    });

    if (!kyc) {
      throw ApiError.notFound('KYC submission not found');
    }

    if (kyc.verifiedAt) {
      throw ApiError.conflict('KYC has already been verified');
    }

    const kycStatus = status === 'VERIFIED' ? 'VERIFIED' : 'REJECTED';

    // Update KYC record
    await prisma.kycVerification.update({
      where: { id: kycId },
      data: {
        verifiedAt: status === 'VERIFIED' ? new Date() : null,
        verifiedBy: adminId,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null,
      },
    });

    // Update user's KYC status
    await prisma.user.update({
      where: { id: kyc.userId },
      data: { kycStatus },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: kyc.userId,
        type: status === 'VERIFIED' ? 'KYC_APPROVED' : 'KYC_REJECTED',
        title: status === 'VERIFIED' ? 'KYC Verified' : 'KYC Rejected',
        message:
          status === 'VERIFIED'
            ? 'Your identity has been verified successfully. You can now create loan agreements.'
            : `Your KYC was rejected: ${rejectionReason}. Please resubmit.`,
      },
    });

    // Audit log
    await auditService.log({
      entityType: 'KYC',
      entityId: kycId,
      action: 'VERIFY',
      actorId: adminId,
      oldValues: { status: 'PENDING' },
      newValues: { status: kycStatus, rejectionReason },
      ipAddress,
      userAgent,
    });

    return { status: kycStatus };
  }

  /**
   * Admin: list all pending KYC submissions.
   */
  async listPending({ page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      prisma.kycVerification.findMany({
        where: {
          user: { kycStatus: 'PENDING' },
        },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, phone: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.kycVerification.count({
        where: { user: { kycStatus: 'PENDING' } },
      }),
    ]);

    return { submissions, total, page, limit };
  }
}

module.exports = new KycService();
