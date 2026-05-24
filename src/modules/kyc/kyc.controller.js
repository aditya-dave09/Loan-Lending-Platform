const kycService = require('./kyc.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { parsePagination } = require('../../utils/helpers');

const submit = asyncHandler(async (req, res) => {
  const result = await kycService.submit({
    documentType: req.body.documentType,
    documentNumber: req.body.documentNumber,
    documentFile: req.files?.documentFile?.[0],
    selfieFile: req.files?.selfieFile?.[0],
    userId: req.user.id,
  });

  res.status(201).json(ApiResponse.created(result, 'KYC submitted for verification'));
});

const getStatus = asyncHandler(async (req, res) => {
  const result = await kycService.getStatus(req.user.id);
  res.status(200).json(ApiResponse.ok(result));
});

const verify = asyncHandler(async (req, res) => {
  const result = await kycService.verify({
    kycId: req.params.id,
    status: req.body.status,
    rejectionReason: req.body.rejectionReason,
    adminId: req.user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(200).json(ApiResponse.ok(result, `KYC ${result.status.toLowerCase()}`));
});

const listPending = asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const result = await kycService.listPending({ page, limit });
  res.status(200).json(
    ApiResponse.paginated(result.submissions, {
      page: result.page,
      limit: result.limit,
      total: result.total,
    }),
  );
});

module.exports = { submit, getStatus, verify, listPending };
