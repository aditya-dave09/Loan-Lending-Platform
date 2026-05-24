const repaymentService = require('./repayment.service');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getSchedule = asyncHandler(async (req, res) => {
  const result = await repaymentService.getSchedule(req.params.id, req.user.id);
  res.status(200).json(ApiResponse.ok(result));
});

const recordPayment = asyncHandler(async (req, res) => {
  const result = await repaymentService.recordPayment({
    scheduleId: req.params.scheduleId,
    amountPaid: parseFloat(req.body.amountPaid),
    paymentMethod: req.body.paymentMethod,
    transactionRef: req.body.transactionRef,
    notes: req.body.notes,
    proofFile: req.file,
    userId: req.user.id,
  });
  res.status(201).json(ApiResponse.created(result, 'Payment recorded successfully'));
});

module.exports = { getSchedule, recordPayment };
