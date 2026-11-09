const dotenv = require('dotenv');
const path = require('path');

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  appName: process.env.APP_NAME || 'LoanForge',
  appUrl: process.env.APP_URL || 'http://localhost:3000',

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // Bcrypt
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,

  // Email
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'LoanForge <noreply@loanforge.com>',
  },

  // File uploads
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5MB
  },

  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 10) || 5,
  },
};


/**
 * Production environment safety checks.
 * Prevent the API from starting with missing or
 * insecure configuration.
 */
if (config.env === 'production') {
  const requiredVariables = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'FRONTEND_URL',
    'APP_URL',
    'AI_API_KEY',
    'AI_CHAT_COMPLETIONS_URL',
    'AI_MODEL',
  ];

  const missing = requiredVariables.filter(
    (name) => !process.env[name]?.trim()
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing production environment variables: ${missing.join(', ')}`
    );
  }

  if (
    config.jwt.accessSecret.length < 32 ||
    config.jwt.refreshSecret.length < 32 ||
    config.jwt.accessSecret === config.jwt.refreshSecret
  ) {
    throw new Error(
      'Production JWT secrets must be distinct and at least 32 characters long'
    );
  }

  if (
    !config.appUrl.startsWith('https://') ||
    !config.frontendUrl.startsWith('https://')
  ) {
    throw new Error(
      'Production APP_URL and FRONTEND_URL must use HTTPS'
    );
  }
}

module.exports = config;

