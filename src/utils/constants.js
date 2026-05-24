/**
 * Application-wide constants and enums.
 */

const LOAN_STATUS_TRANSITIONS = {
  DRAFT: ['PENDING_SIGNATURES', 'CANCELLED'],
  PENDING_SIGNATURES: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'DEFAULTED', 'DISPUTED'],
  DISPUTED: ['ACTIVE'],
  // Terminal states — no transitions allowed
  COMPLETED: [],
  DEFAULTED: [],
  CANCELLED: [],
};

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const OTP_EXPIRY_MINUTES = 5;
const OTP_LENGTH = 6;

const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
};

const CACHE_TTL = {
  DASHBOARD_STATS: 300,     // 5 minutes
  USER_PROFILE: 600,        // 10 minutes
  LOAN_DETAILS: 300,        // 5 minutes
};

module.exports = {
  LOAN_STATUS_TRANSITIONS,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  OTP_EXPIRY_MINUTES,
  OTP_LENGTH,
  PAGINATION_DEFAULTS,
  CACHE_TTL,
};
