const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const auditService = require('../../services/audit.service');
const { generateOTP, sha256 } = require('../../utils/helpers');
const { OTP_EXPIRY_MINUTES } = require('../../utils/constants');

class SignatureService {
  /**
   * Request OTP for signing a loan agreement.
   */
  async requestOTP({ loanId, userId, ipAddress, userAgent }) {
    const loan = await prisma.loanAgreement.findUnique({
      where: { id: loanId },
      include: { participants: true },
    });

    if (!loan) {
      throw ApiError.notFound('Loan agreement not found');
    }

    // Must be in PENDING_SIGNATURES status
    if (loan.status !== 'PENDING_SIGNATURES') {
      throw ApiError.badRequest('Loan must be in PENDING_SIGNATURES status to sign');
    }

    // User must be a participant
    const participant = loan.participants.find((p) => p.userId === userId);
    if (!participant) {
      throw ApiError.forbidden('You are not a participant in this loan');
    }

    // Check if already signed
    const existingSignature = await prisma.digitalSignature.findUnique({
      where: { loanId_userId: { loanId, userId } },
    });

    if (existingSignature?.status === 'SIGNED') {
      throw ApiError.conflict('You have already signed this agreement');
    }

    // Generate OTP
    const otp = generateOTP(6);
    const otpHash = sha256(otp);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Upsert signature record
    await prisma.digitalSignature.upsert({
      where: { loanId_userId: { loanId, userId } },
      update: {
        otpHash,
        otpExpiresAt,
        status: 'OTP_SENT',
      },
      create: {
        loanId,
        userId,
        otpHash,
        otpExpiresAt,
        status: 'OTP_SENT',
        ipAddress,
        userAgent,
      },
    });

    // In production, send OTP via email/SMS here
    // For development, log it
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`\n🔐 OTP for signing agreement ${loan.agreementNumber}: ${otp}\n`);
    }

    // TODO: Send email with OTP via email.service.js

    return {
      message: 'OTP sent to your registered email',
      expiresIn: OTP_EXPIRY_MINUTES * 60,
      // Include OTP in dev mode for testing
      ...(process.env.NODE_ENV === 'development' && { _devOtp: otp }),
    };
  }

  /**
   * Verify OTP and sign the agreement.
   */
  async verifyAndSign({ loanId, userId, otp, ipAddress, userAgent }) {
    const signature = await prisma.digitalSignature.findUnique({
      where: { loanId_userId: { loanId, userId } },
    });

    if (!signature) {
      throw ApiError.notFound('No signing request found. Please request OTP first.');
    }

    if (signature.status === 'SIGNED') {
      throw ApiError.conflict('You have already signed this agreement');
    }

    if (signature.status !== 'OTP_SENT') {
      throw ApiError.badRequest('Please request a new OTP');
    }

    // Check OTP expiry
    if (new Date() > signature.otpExpiresAt) {
      await prisma.digitalSignature.update({
        where: { id: signature.id },
        data: { status: 'EXPIRED' },
      });
      throw ApiError.badRequest('OTP has expired. Please request a new one.');
    }

    // Verify OTP
    const otpHash = sha256(otp);
    if (otpHash !== signature.otpHash) {
      throw ApiError.unauthorized('Invalid OTP');
    }

    // Generate signature hash
    const signatureHash = sha256(`${loanId}:${userId}:${new Date().toISOString()}:${otp}`);

    // Mark as signed
    const signedAt = new Date();
    await prisma.digitalSignature.update({
      where: { id: signature.id },
      data: {
        status: 'SIGNED',
        signedAt,
        ipAddress,
        userAgent,
        signatureHash,
        otpHash: null, // Clear OTP after use
      },
    });

    // Check if all participants have signed
    const loan = await prisma.loanAgreement.findUnique({
      where: { id: loanId },
      include: {
        participants: true,
        signatures: true,
      },
    });

    const allSigned = loan.participants.every((participant) =>
      loan.signatures.some((sig) => sig.userId === participant.userId && sig.status === 'SIGNED'),
    );

    // If all signed, activate the loan
    if (allSigned) {
      await prisma.loanAgreement.update({
        where: { id: loanId },
        data: {
          status: 'ACTIVE',
          activatedAt: new Date(),
        },
      });

      // Update repayment schedule — mark first installment as DUE
      const firstInstallment = await prisma.repaymentSchedule.findFirst({
        where: { loanId, installmentNumber: 1 },
      });
      if (firstInstallment) {
        await prisma.repaymentSchedule.update({
          where: { id: firstInstallment.id },
          data: { status: 'DUE' },
        });
      }

      // Notify both parties
      for (const participant of loan.participants) {
        await prisma.notification.create({
          data: {
            userId: participant.userId,
            type: 'LOAN_SIGNED',
            title: 'Agreement Activated',
            message: `Loan agreement ${loan.agreementNumber} is now active. All parties have signed.`,
            data: { loanId: loan.id },
          },
        });
      }

      // Audit log for activation
      await auditService.log({
        entityType: 'LOAN',
        entityId: loanId,
        action: 'STATUS_CHANGE',
        actorId: userId,
        oldValues: { status: 'PENDING_SIGNATURES' },
        newValues: { status: 'ACTIVE' },
        metadata: { trigger: 'all_parties_signed' },
      });
    }

    // Audit log for signature
    await auditService.log({
      entityType: 'LOAN',
      entityId: loanId,
      action: 'SIGN',
      actorId: userId,
      newValues: { signedAt, signatureHash },
      ipAddress,
      userAgent,
    });

    return {
      signedAt,
      signatureHash,
      loanActivated: allSigned,
    };
  }
}

module.exports = new SignatureService();
