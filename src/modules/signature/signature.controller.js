const signatureService = require('./signature.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const requestOTP = asyncHandler(async (req, res) => {
  const result = await signatureService.requestOTP({
    loanId: req.params.id,
    userId: req.user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
  res.status(200).json(ApiResponse.ok(result));
});

const verifyAndSign = asyncHandler(async (req, res) => {
  const result = await signatureService.verifyAndSign({
    loanId: req.params.id,
    userId: req.user.id,
    otp: req.body.otp,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
  const message = result.loanActivated
    ? 'Agreement signed and activated — all parties have signed'
    : 'Agreement signed successfully';
  res.status(200).json(ApiResponse.ok(result, message));
});

module.exports = { requestOTP, verifyAndSign };
