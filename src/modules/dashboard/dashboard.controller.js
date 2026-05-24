const prisma = require('../../config/database');
const cacheService = require('../../services/cache.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { CACHE_TTL } = require('../../utils/constants');

const getStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const cacheKey = `dashboard:${userId}`;

  // Try cache first
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return res.status(200).json(ApiResponse.ok(cached, 'Dashboard stats (cached)'));
  }

  // Fetch all user's loan participations
  const participations = await prisma.loanParticipant.findMany({
    where: { userId },
    include: {
      loan: {
        include: {
          repaymentSchedule: true,
          participants: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  const asLender = participations.filter((p) => p.role === 'LENDER');
  const asBorrower = participations.filter((p) => p.role === 'BORROWER');

  const activeLoans = participations.filter((p) => p.loan.status === 'ACTIVE').length;

  const totalLent = asLender.reduce(
    (sum, p) => sum + parseFloat(p.loan.principalAmount || 0),
    0,
  );
  const totalBorrowed = asBorrower.reduce(
    (sum, p) => sum + parseFloat(p.loan.principalAmount || 0),
    0,
  );

  // Calculate repayment totals
  let totalRepaymentReceived = 0;
  let totalRepaymentMade = 0;

  asLender.forEach((p) => {
    p.loan.repaymentSchedule.forEach((s) => {
      totalRepaymentReceived += parseFloat(s.paidAmount || 0);
    });
  });

  asBorrower.forEach((p) => {
    p.loan.repaymentSchedule.forEach((s) => {
      totalRepaymentMade += parseFloat(s.paidAmount || 0);
    });
  });

  // Overdue payments
  const overduePayments = participations.reduce((count, p) => {
    return count + p.loan.repaymentSchedule.filter((s) => s.status === 'OVERDUE').length;
  }, 0);

  // Upcoming payments (next 30 days, as borrower)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const upcomingPayments = [];
  asBorrower.forEach((p) => {
    if (p.loan.status !== 'ACTIVE') {
      return;
    }
    p.loan.repaymentSchedule
      .filter((s) => (s.status === 'DUE' || s.status === 'UPCOMING') && new Date(s.dueDate) <= thirtyDaysFromNow)
      .forEach((s) => {
        const counterparty = p.loan.participants.find((pp) => pp.userId !== userId);
        upcomingPayments.push({
          loanId: p.loan.id,
          agreementNumber: p.loan.agreementNumber,
          dueDate: s.dueDate,
          amountDue: parseFloat(s.amountDue).toFixed(2),
          counterparty: counterparty
            ? `${counterparty.user.firstName} ${counterparty.user.lastName}`
            : null,
        });
      });
  });

  // Sort upcoming by due date
  upcomingPayments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const stats = {
    totalLoansAsLender: asLender.length,
    totalLoansAsBorrower: asBorrower.length,
    activeLoans,
    totalLent: totalLent.toFixed(2),
    totalBorrowed: totalBorrowed.toFixed(2),
    totalRepaymentReceived: totalRepaymentReceived.toFixed(2),
    totalRepaymentMade: totalRepaymentMade.toFixed(2),
    overduePayments,
    upcomingPayments: upcomingPayments.slice(0, 5),
  };

  // Cache for 5 minutes
  await cacheService.set(cacheKey, stats, CACHE_TTL.DASHBOARD_STATS);

  res.status(200).json(ApiResponse.ok(stats));
});

module.exports = { getStats };
