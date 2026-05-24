const crypto = require('crypto');

/**
 * Generate a unique agreement number.
 * Format: LF-YYYY-NNNNNN (e.g., LF-2026-000042)
 *
 * @param {number} sequence - The sequential number
 * @returns {string}
 */
function generateAgreementNumber(sequence) {
  const year = new Date().getFullYear();
  const paddedSeq = String(sequence).padStart(6, '0');
  return `LF-${year}-${paddedSeq}`;
}

/**
 * Generate a SHA-256 integrity hash for an agreement.
 * Used for tamper-proof verification.
 *
 * @param {object} agreement - Agreement data
 * @returns {string} SHA-256 hex digest
 */
function generateIntegrityHash(agreement) {
  const payload = JSON.stringify({
    id: agreement.id,
    agreementNumber: agreement.agreementNumber,
    principalAmount: String(agreement.principalAmount),
    interestRate: String(agreement.interestRate),
    tenureMonths: agreement.tenureMonths,
    createdAt: agreement.createdAt,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Generate a random OTP of specified length.
 *
 * @param {number} length - OTP length (default 6)
 * @returns {string}
 */
function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % 10];
  }
  return otp;
}

/**
 * Hash a string with SHA-256.
 *
 * @param {string} input
 * @returns {string} SHA-256 hex digest
 */
function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Calculate file checksum.
 *
 * @param {Buffer} buffer - File buffer
 * @returns {string} SHA-256 hex digest
 */
function fileChecksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Parse pagination params with defaults and bounds.
 *
 * @param {object} query - Express req.query
 * @returns {{ page: number, limit: number, skip: number }}
 */
function parsePagination(query) {
  let page = parseInt(query.page, 10) || 1;
  let limit = parseInt(query.limit, 10) || 20;

  page = Math.max(1, page);
  limit = Math.max(1, Math.min(100, limit));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

module.exports = {
  generateAgreementNumber,
  generateIntegrityHash,
  generateOTP,
  sha256,
  fileChecksum,
  parsePagination,
};
