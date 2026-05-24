const loanService = require('./loan.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const loan = await loanService.create({
    ...req.body,
    lenderId: req.user.id,
  });
  res.status(201).json(ApiResponse.created(loan, 'Loan agreement created'));
});

const getById = asyncHandler(async (req, res) => {
  const loan = await loanService.getById(req.params.id, req.user.id);
  res.status(200).json(ApiResponse.ok(loan));
});

const list = asyncHandler(async (req, res) => {
  const result = await loanService.list(req.user.id, req.query);
  res.status(200).json(
    ApiResponse.paginated(result.loans, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    }),
  );
});

const updateStatus = asyncHandler(async (req, res) => {
  const result = await loanService.updateStatus({
    loanId: req.params.id,
    newStatus: req.body.status,
    userId: req.user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.status(200).json(ApiResponse.ok(result, `Loan status updated to ${result.status}`));
});

const verifyIntegrity = asyncHandler(async (req, res) => {
  const result = await loanService.verifyIntegrity(req.params.id);
  const message = result.valid ? 'Agreement integrity verified' : 'Agreement integrity check FAILED — possible tampering';
  res.status(200).json(ApiResponse.ok(result, message));
});

module.exports = { create, getById, list, updateStatus, verifyIntegrity };
