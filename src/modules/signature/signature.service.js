
const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const emailService = require('../../services/email.service');
const auditService = require('../../services/audit.service');

const { generateOTP, sha256 } = require('../../utils/helpers');
const { OTP_EXPIRY_MINUTES } = require('../../utils/constants');

class SignatureService {
  /**
   * Generate and deliver a signing OTP.
   */
  async requestOTP({ loanId, userId, ipAddress, userAgent }) {
    // 1. Find the agreement and its participants.
    const loan = await prisma.loanAgreement.findUnique({
      where: { id: loanId },
      include: { participants: true },
    });

    if (!loan) {
      throw ApiError.notFound('Loan agreement not found');
    }

    // 2. Only agreements awaiting signatures can be signed.
    if (loan.status !== 'PENDING_SIGNATURES') {
      throw ApiError.badRequest(
        'Agreement must be awaiting signatures before requesting a code'
      );
    }

    // 3. Only an actual participant can request a code.
    const participant = loan.participants.find(
      (p) => p.userId === userId
    );

    if (!participant) {
      throw ApiError.forbidden(
        'You are not a participant in this agreement'
      );
    }

    // 4. Do not issue another code to someone who signed.
    const existingSignature = await prisma.digitalSignature.findUnique({
      where: {
        loanId_userId: { loanId, userId },
      },
    });

    if (existingSignature?.status === 'SIGNED') {
      throw ApiError.conflict(
        'You have already confirmed this agreement'
      );
    }

    const isDevelopment = process.env.NODE_ENV === 'development';

    // 5. Verify that email delivery is configured outside development.
    if (
      !isDevelopment &&
      (!process.env.SMTP_USER || !process.env.SMTP_PASS)
    ) {
      throw ApiError.internal(
        'Signing email delivery is not configured'
      );
    }

    // 6. Generate a random six-digit OTP.
    const otp = generateOTP(6);

    // Store only a hash, not the actual OTP.
    const otpHash = sha256(otp);

    const otpExpiresAt = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
    );

    // 7. Create or refresh the participant's pending signature.
    await prisma.digitalSignature.upsert({
      where: {
        loanId_userId: { loanId, userId },
      },
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

    // 8. Deliver the OTP.
    if (isDevelopment) {
      // Local testing only; never expose OTPs in production.
      console.log(
        `Local development OTP for ${loan.agreementNumber}: ${otp}`
      );
    } else {
      const recipient = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!recipient?.email) {
        throw ApiError.notFound('Participant email not found');
      }

      const delivery = await emailService.sendOTP(
        recipient.email,
        otp,
        loan.agreementNumber
      );

      if (!delivery) {
        throw ApiError.internal(
          'Could not deliver the signing code. Please try again.'
        );
      }
    }

    // 9. Return a safe response.
    return {
      message: isDevelopment
        ? 'Development signing code generated'
        : 'Signing code sent to your registered email',
      expiresIn: OTP_EXPIRY_MINUTES * 60,

      // ONLY available when NODE_ENV is development.
      ...(isDevelopment ? { _devOtp: otp } : {}),
    };
  }

  /**
   * Validate OTP and record agreement confirmation.
   */
  async verifyAndSign({
    loanId,
    userId,
    otp,
    ipAddress,
    userAgent,
  }) {
    // 1. Validate OTP format.
    if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      throw ApiError.badRequest(
        'Signing code must contain exactly six digits'
      );
    }

    // 2. Confirm signature and possible activation together.
    const result = await prisma.$transaction(async (tx) => {
      // Lock the agreement row to serialize concurrent signing.
      // This project uses PostgreSQL.
      const locked = await tx.$queryRaw`
        SELECT id
        FROM "loan_agreements"
        WHERE id = ${loanId}
        FOR UPDATE
      `;

      if (locked.length === 0) {
        throw ApiError.notFound('Loan agreement not found');
      }

      // 3. Fetch the agreement and its participants.
      const loan = await tx.loanAgreement.findUnique({
        where: { id: loanId },
        include: { participants: true },
      });

      if (!loan) {
        throw ApiError.notFound('Loan agreement not found');
      }

      // 4. Only pending agreements can be confirmed.
      if (loan.status !== 'PENDING_SIGNATURES') {
        throw ApiError.badRequest(
          'Agreement is not awaiting signatures'
        );
      }

      // 5. Verify the user belongs to the agreement.
      const isParticipant = loan.participants.some(
        (participant) => participant.userId === userId
      );

      if (!isParticipant) {
        throw ApiError.forbidden(
          'You are not a participant in this agreement'
        );
      }

      // 6. Find this participant's OTP record.
      const signature = await tx.digitalSignature.findUnique({
        where: {
          loanId_userId: { loanId, userId },
        },
      });

      if (!signature) {
        throw ApiError.notFound(
          'No signing request found. Please request a code first.'
        );
      }

      if (signature.status === 'SIGNED') {
        throw ApiError.conflict(
          'You have already confirmed this agreement'
        );
      }

      if (signature.status !== 'OTP_SENT') {
        throw ApiError.badRequest(
          'Please request a new signing code'
        );
      }

      // 7. Reject expired codes.
      if (
        !signature.otpExpiresAt ||
        new Date() >= signature.otpExpiresAt
      ) {
        throw ApiError.badRequest(
          'Signing code has expired. Please request a new one.'
        );
      }

      // 8. Compare the submitted OTP with the stored hash.
      if (sha256(otp) !== signature.otpHash) {
        throw ApiError.unauthorized('Invalid signing code');
      }

      // 9. Prepare the confirmation record.
      const signedAt = new Date();

      const signatureHash = sha256(
        `${loanId}:${userId}:${signedAt.toISOString()}:${signature.otpHash}`
      );

      // 10. Mark this participant's signature as confirmed.
      await tx.digitalSignature.update({
        where: { id: signature.id },
        data: {
          status: 'SIGNED',
          signedAt,
          ipAddress,
          userAgent,
          signatureHash,
          otpHash: null,
          otpExpiresAt: null,
        },
      });

      // 11. Check whether all participants have confirmed.
      const signatures = await tx.digitalSignature.findMany({
        where: {
          loanId,
          status: 'SIGNED',
        },
        select: { userId: true },
      });

      const signedUserIds = new Set(
        signatures.map((record) => record.userId)
      );

      const allSigned =
        loan.participants.length >= 2 &&
        loan.participants.every(
          (participant) => signedUserIds.has(participant.userId)
        );

      // 12. Activate only after everyone has confirmed.
      if (allSigned) {
        await tx.loanAgreement.update({
          where: { id: loanId },
          data: {
            status: 'ACTIVE',
            activatedAt: signedAt,
          },
        });

        // Mark the first scheduled installment as due.
        await tx.repaymentSchedule.updateMany({
          where: {
            loanId,
            installmentNumber: 1,
            status: 'UPCOMING',
          },
          data: {
            status: 'DUE',
          },
        });

        // Notify both parties.
        await tx.notification.createMany({
          data: loan.participants.map((participant) => ({
            userId: participant.userId,
            type: 'LOAN_SIGNED',
            title: 'Agreement Activated',
            message:
              `Loan agreement ${loan.agreementNumber} is now active. ` +
              'All participants have confirmed.',
            data: { loanId: loan.id },
          })),
        });
      }

      return {
        signedAt,
        signatureHash,
        loanActivated: allSigned,
      };
    });

    // 13. Record the confirmation in the audit history.
    await auditService.log({
      entityType: 'LOAN',
      entityId: loanId,
      action: 'SIGN',
      actorId: userId,
      newValues: {
        signedAt: result.signedAt,
        signatureHash: result.signatureHash,
      },
      ipAddress,
      userAgent,
    });

    if (result.loanActivated) {
      await auditService.log({
        entityType: 'LOAN',
        entityId: loanId,
        action: 'STATUS_CHANGE',
        actorId: userId,
        oldValues: {
          status: 'PENDING_SIGNATURES',
        },
        newValues: {
          status: 'ACTIVE',
        },
        metadata: {
          trigger: 'all_participants_confirmed',
        },
      });
    }

    // 14. Respond to the frontend.
    return result;
  }
}

module.exports = new SignatureService();
