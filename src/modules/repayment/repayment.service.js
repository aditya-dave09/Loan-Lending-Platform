const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const auditService = require('../../services/audit.service');
const cacheService = require('../../services/cache.service');
const { fileChecksum } = require('../../utils/helpers');
const fs = require('fs');

class RepaymentService {
  /**
   * Get repayment schedule and summary for a loan.
   */
  async getSchedule(loanId, userId) {
    const loan = await prisma.loanAgreement.findUnique({
      where: { id: loanId },
      include: {
        participants: true,
        repaymentSchedule: {
          orderBy: { installmentNumber: 'asc' },
          include: {
            transactions: {
              orderBy: { paidAt: 'desc' },
            },
          },
        },
      },
    });

    if (!loan) {
      throw ApiError.notFound('Loan agreement not found');
    }

    const isParticipant = loan.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw ApiError.forbidden('You are not a participant in this loan');
    }

    // Calculate summary
    const totalRepayable = parseFloat(loan.totalRepayable || 0);
    const totalPaid = loan.repaymentSchedule.reduce(
      (sum, s) => sum + parseFloat(s.paidAmount || 0),
      0,
    );
    const totalRemaining = Math.max(0, totalRepayable - totalPaid);

    const nextDue = loan.repaymentSchedule.find(
      (s) => s.status === 'DUE' || s.status === 'UPCOMING',
    );
    const overdueCount = loan.repaymentSchedule.filter((s) => s.status === 'OVERDUE').length;

    return {
      summary: {
        totalRepayable: totalRepayable.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        totalRemaining: totalRemaining.toFixed(2),
        nextDueDate: nextDue?.dueDate || null,
        nextDueAmount: nextDue ? parseFloat(nextDue.amountDue).toFixed(2) : null,
        overdueCount,
      },
      schedule: loan.repaymentSchedule.map((s) => ({
        id: s.id,
        installment: s.installmentNumber,
        amountDue: s.amountDue,
        principalPortion: s.principalPortion,
        interestPortion: s.interestPortion,
        dueDate: s.dueDate,
        status: s.status,
        paidAmount: s.paidAmount,
        paidAt: s.paidAt,
        transactions: s.transactions,
      })),
    };
  }

  /**
   * Record a payment for an installment.
   */
  async recordPayment({ scheduleId, amountPaid, paymentMethod, transactionRef, notes, proofFile, userId }) {
    const schedule = await prisma.repaymentSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        loan: {
          include: {
            participants: true,
            repaymentSchedule: true,
          },
        },
      },
    });

    if (!schedule) {
      throw ApiError.notFound('Repayment schedule not found');
    }

    // Verify borrower
    const borrowerParticipant = schedule.loan.participants.find(
      (p) => p.role === 'BORROWER',
    );
    if (!borrowerParticipant || borrowerParticipant.userId !== userId) {
      throw ApiError.forbidden('Only the borrower can record payments');
    }

    // Check loan is active
    if (schedule.loan.status !== 'ACTIVE') {
      throw ApiError.badRequest('Payments can only be made on active loans');
    }

    // Check installment is payable
    if (schedule.status === 'PAID') {
      throw ApiError.conflict('This installment is already fully paid');
    }

    const amountDue = parseFloat(schedule.amountDue);
    const alreadyPaid = parseFloat(schedule.paidAmount || 0);
    const remaining = amountDue - alreadyPaid;

    if (amountPaid > remaining) {
      throw ApiError.badRequest(
        `Payment amount (₹${amountPaid}) exceeds remaining due (₹${remaining.toFixed(2)})`,
      );
    }

    // Store proof document if provided
    let proofDocumentId = null;
    if (proofFile) {
      const buffer = fs.readFileSync(proofFile.path);
      const doc = await prisma.document.create({
        data: {
          fileName: proofFile.filename,
          originalName: proofFile.originalname,
          mimeType: proofFile.mimetype,
          fileSize: proofFile.size,
          filePath: proofFile.path,
          purpose: 'PAYMENT_PROOF',
          uploadedBy: userId,
          loanId: schedule.loan.id,
          checksum: fileChecksum(buffer),
        },
      });
      proofDocumentId = doc.id;
    }

    // Record transaction
    const transaction = await prisma.repaymentTransaction.create({
      data: {
        scheduleId,
        amountPaid,
        paymentMethod,
        transactionRef,
        proofDocumentId,
        notes,
        recordedBy: userId,
      },
    });

    // Update schedule status
    const newPaidAmount = alreadyPaid + amountPaid;
    const isFullyPaid = newPaidAmount >= amountDue;

    await prisma.repaymentSchedule.update({
      where: { id: scheduleId },
      data: {
        paidAmount: newPaidAmount,
        status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
        paidAt: isFullyPaid ? new Date() : null,
      },
    });

    // If fully paid, mark next installment as DUE
    if (isFullyPaid) {
      const nextInstallment = await prisma.repaymentSchedule.findFirst({
        where: {
          loanId: schedule.loanId,
          installmentNumber: schedule.installmentNumber + 1,
        },
      });

      if (nextInstallment && nextInstallment.status === 'UPCOMING') {
        await prisma.repaymentSchedule.update({
          where: { id: nextInstallment.id },
          data: { status: 'DUE' },
        });
      }

      // Check if ALL installments are paid → complete the loan
      const allInstallments = await prisma.repaymentSchedule.findMany({
        where: { loanId: schedule.loanId },
      });
      const allPaid = allInstallments.every((inst) => inst.status === 'PAID' || (inst.id === scheduleId && isFullyPaid));

      if (allPaid) {
        await prisma.loanAgreement.update({
          where: { id: schedule.loanId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });

        // Notify both parties
        for (const participant of schedule.loan.participants) {
          await prisma.notification.create({
            data: {
              userId: participant.userId,
              type: 'PAYMENT_RECEIVED',
              title: 'Loan Completed!',
              message: `All payments for loan ${schedule.loan.agreementNumber} have been completed.`,
              data: { loanId: schedule.loanId },
            },
          });
        }
      }
    }

    // Notify lender
    const lenderParticipant = schedule.loan.participants.find((p) => p.role === 'LENDER');
    if (lenderParticipant) {
      await prisma.notification.create({
        data: {
          userId: lenderParticipant.userId,
          type: 'PAYMENT_RECEIVED',
          title: 'Payment Received',
          message: `₹${amountPaid} received for installment #${schedule.installmentNumber} of loan ${schedule.loan.agreementNumber}.`,
          data: { loanId: schedule.loanId, scheduleId, amountPaid },
        },
      });
    }

    // Audit log
    await auditService.log({
      entityType: 'PAYMENT',
      entityId: transaction.id,
      action: 'CREATE',
      actorId: userId,
      newValues: { amountPaid, paymentMethod, scheduleId, installment: schedule.installmentNumber },
    });

    // Invalidate dashboard cache
    await cacheService.delPattern('dashboard:*');

    return {
      transactionId: transaction.id,
      installment: schedule.installmentNumber,
      amountPaid,
      status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
      remainingBalance: (remaining - amountPaid).toFixed(2),
    };
  }
}

module.exports = new RepaymentService();
