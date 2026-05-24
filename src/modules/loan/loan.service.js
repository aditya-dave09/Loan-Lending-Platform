const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const auditService = require('../../services/audit.service');
const cacheService = require('../../services/cache.service');
const { generateRepaymentSchedule } = require('../../utils/emiCalculator');
const { generateAgreementNumber, generateIntegrityHash } = require('../../utils/helpers');
const { LOAN_STATUS_TRANSITIONS } = require('../../utils/constants');

class LoanService {
  /**
   * Create a new loan agreement.
   */
  async create({ borrowerEmail, principalAmount, interestRate, tenureMonths, repaymentFrequency, purpose, terms, lenderId }) {
    // Verify lender's KYC
    const lender = await prisma.user.findUnique({ where: { id: lenderId } });
    if (lender.kycStatus !== 'VERIFIED') {
      throw ApiError.forbidden('Your KYC must be verified before creating a loan');
    }

    // Find and verify borrower
    const borrower = await prisma.user.findUnique({ where: { email: borrowerEmail } });
    if (!borrower) {
      throw ApiError.notFound('No user found with this email address');
    }
    if (borrower.id === lenderId) {
      throw ApiError.badRequest('You cannot create a loan with yourself');
    }
    if (borrower.kycStatus !== 'VERIFIED') {
      throw ApiError.badRequest("The borrower's KYC is not verified yet");
    }

    // Generate unique agreement number
    const loanCount = await prisma.loanAgreement.count();
    const agreementNumber = generateAgreementNumber(loanCount + 1);

    // Calculate repayment schedule
    const { schedule, totalRepayable } = generateRepaymentSchedule(
      principalAmount,
      interestRate,
      tenureMonths,
      new Date(),
    );

    // Create loan with participants and schedule in a transaction
    const loan = await prisma.$transaction(async (tx) => {
      // Create the loan agreement
      const newLoan = await tx.loanAgreement.create({
        data: {
          agreementNumber,
          principalAmount,
          interestRate,
          tenureMonths,
          repaymentFrequency,
          purpose,
          terms,
          totalRepayable,
          status: 'DRAFT',
          participants: {
            createMany: {
              data: [
                { userId: lenderId, role: 'LENDER' },
                { userId: borrower.id, role: 'BORROWER' },
              ],
            },
          },
          repaymentSchedule: {
            createMany: {
              data: schedule.map((item) => ({
                installmentNumber: item.installmentNumber,
                amountDue: item.amountDue,
                principalPortion: item.principalPortion,
                interestPortion: item.interestPortion,
                dueDate: item.dueDate,
                status: 'UPCOMING',
              })),
            },
          },
        },
        include: {
          participants: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
          repaymentSchedule: {
            orderBy: { installmentNumber: 'asc' },
          },
        },
      });

      // Generate integrity hash
      const integrityHash = generateIntegrityHash(newLoan);
      await tx.loanAgreement.update({
        where: { id: newLoan.id },
        data: { integrityHash },
      });

      return { ...newLoan, integrityHash };
    });

    // Create notifications
    await prisma.notification.createMany({
      data: [
        {
          userId: borrower.id,
          type: 'LOAN_CREATED',
          title: 'New Loan Agreement',
          message: `${lender.firstName} ${lender.lastName} has created a loan agreement of ₹${principalAmount} with you.`,
          data: { loanId: loan.id, agreementNumber },
        },
        {
          userId: lenderId,
          type: 'LOAN_CREATED',
          title: 'Loan Agreement Created',
          message: `Your loan agreement ${agreementNumber} with ${borrower.firstName} ${borrower.lastName} has been created.`,
          data: { loanId: loan.id, agreementNumber },
        },
      ],
    });

    // Audit log
    await auditService.log({
      entityType: 'LOAN',
      entityId: loan.id,
      action: 'CREATE',
      actorId: lenderId,
      newValues: { agreementNumber, principalAmount, interestRate, tenureMonths, borrowerId: borrower.id },
    });

    // Invalidate dashboard cache
    await cacheService.delPattern('dashboard:*');

    return this._formatLoanResponse(loan);
  }

  /**
   * Get a single loan with full details.
   */
  async getById(loanId, userId) {
    const loan = await prisma.loanAgreement.findUnique({
      where: { id: loanId },
      include: {
        participants: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          },
        },
        repaymentSchedule: {
          orderBy: { installmentNumber: 'asc' },
          include: {
            transactions: true,
          },
        },
        signatures: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        documents: true,
      },
    });

    if (!loan) {
      throw ApiError.notFound('Loan agreement not found');
    }

    // Check if user is a participant
    const isParticipant = loan.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw ApiError.forbidden('You are not a participant in this loan agreement');
    }

    return loan;
  }

  /**
   * List loans for the current user.
   */
  async list(userId, { page = 1, limit = 20, status, role }) {
    const skip = (page - 1) * limit;

    const where = {
      participants: {
        some: {
          userId,
          ...(role && { role }),
        },
      },
      ...(status && { status }),
    };

    const [loans, total] = await Promise.all([
      prisma.loanAgreement.findMany({
        where,
        include: {
          participants: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          repaymentSchedule: {
            where: { status: { in: ['DUE', 'UPCOMING'] } },
            orderBy: { dueDate: 'asc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.loanAgreement.count({ where }),
    ]);

    // Add computed fields
    const enrichedLoans = loans.map((loan) => {
      const myParticipant = loan.participants.find((p) => p.userId === userId);
      const counterparty = loan.participants.find((p) => p.userId !== userId);

      return {
        id: loan.id,
        agreementNumber: loan.agreementNumber,
        principalAmount: loan.principalAmount,
        interestRate: loan.interestRate,
        tenureMonths: loan.tenureMonths,
        status: loan.status,
        totalRepayable: loan.totalRepayable,
        myRole: myParticipant?.role,
        counterparty: counterparty
          ? { id: counterparty.user.id, name: `${counterparty.user.firstName} ${counterparty.user.lastName}` }
          : null,
        nextDueDate: loan.repaymentSchedule[0]?.dueDate || null,
        createdAt: loan.createdAt,
      };
    });

    return { loans: enrichedLoans, total, page, limit };
  }

  /**
   * Update loan status with state machine validation.
   */
  async updateStatus({ loanId, newStatus, userId, ipAddress, userAgent }) {
    const loan = await prisma.loanAgreement.findUnique({
      where: { id: loanId },
      include: {
        participants: true,
      },
    });

    if (!loan) {
      throw ApiError.notFound('Loan agreement not found');
    }

    // Check user is a participant
    const participant = loan.participants.find((p) => p.userId === userId);
    if (!participant) {
      throw ApiError.forbidden('You are not a participant in this loan agreement');
    }

    // Only lender can move to PENDING_SIGNATURES
    if (newStatus === 'PENDING_SIGNATURES' && participant.role !== 'LENDER') {
      throw ApiError.forbidden('Only the lender can submit the agreement for signatures');
    }

    // Validate state transition
    const allowedTransitions = LOAN_STATUS_TRANSITIONS[loan.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw ApiError.badRequest(
        `Cannot transition from ${loan.status} to ${newStatus}. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
      );
    }

    const oldStatus = loan.status;

    await prisma.loanAgreement.update({
      where: { id: loanId },
      data: { status: newStatus },
    });

    // Audit log
    await auditService.log({
      entityType: 'LOAN',
      entityId: loanId,
      action: 'STATUS_CHANGE',
      actorId: userId,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      ipAddress,
      userAgent,
    });

    // Invalidate cache
    await cacheService.delPattern('dashboard:*');

    return { status: newStatus };
  }

  /**
   * Verify agreement integrity (public endpoint).
   */
  async verifyIntegrity(loanId) {
    const loan = await prisma.loanAgreement.findUnique({
      where: { id: loanId },
      include: {
        participants: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!loan) {
      throw ApiError.notFound('Loan agreement not found');
    }

    // Recalculate hash and compare
    const computedHash = generateIntegrityHash(loan);
    const isValid = computedHash === loan.integrityHash;

    const lender = loan.participants.find((p) => p.role === 'LENDER');
    const borrower = loan.participants.find((p) => p.role === 'BORROWER');

    return {
      agreementNumber: loan.agreementNumber,
      valid: isValid,
      status: loan.status,
      principalAmount: loan.principalAmount,
      lender: lender ? `${lender.user.firstName} ${lender.user.lastName[0]}.` : null,
      borrower: borrower ? `${borrower.user.firstName} ${borrower.user.lastName[0]}.` : null,
      createdAt: loan.createdAt,
      integrityHash: loan.integrityHash,
    };
  }

  // ── Private Helpers ──────────────────────────

  _formatLoanResponse(loan) {
    const lender = loan.participants.find((p) => p.role === 'LENDER');
    const borrower = loan.participants.find((p) => p.role === 'BORROWER');

    return {
      id: loan.id,
      agreementNumber: loan.agreementNumber,
      principalAmount: loan.principalAmount,
      interestRate: loan.interestRate,
      tenureMonths: loan.tenureMonths,
      repaymentFrequency: loan.repaymentFrequency,
      totalRepayable: loan.totalRepayable,
      status: loan.status,
      integrityHash: loan.integrityHash,
      lender: lender
        ? { id: lender.user.id, name: `${lender.user.firstName} ${lender.user.lastName}` }
        : null,
      borrower: borrower
        ? { id: borrower.user.id, name: `${borrower.user.firstName} ${borrower.user.lastName}` }
        : null,
      repaymentSchedule: loan.repaymentSchedule?.map((s) => ({
        installment: s.installmentNumber,
        amountDue: s.amountDue,
        principalPortion: s.principalPortion,
        interestPortion: s.interestPortion,
        dueDate: s.dueDate,
        status: s.status,
      })),
      createdAt: loan.createdAt,
    };
  }
}

module.exports = new LoanService();
