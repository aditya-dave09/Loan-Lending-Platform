const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const config = require('./config');
const logger = require('./config/logger');
const swaggerSpec = require('./config/swagger');
const requestId = require('./middleware/requestId');
const { generalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');

// Import route modules
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const kycRoutes = require('./modules/kyc/kyc.routes');
const loanRoutes = require('./modules/loan/loan.routes');
const signatureRoutes = require('./modules/signature/signature.routes');
const repaymentRoutes = require('./modules/repayment/repayment.routes');
const documentRoutes = require('./modules/document/document.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const notificationRoutes = require('./modules/notification/notification.routes');
const webhookRoutes = require('./modules/webhook/webhook.routes');

const app = express();

// ─────────────────────────────────────────────
// GLOBAL MIDDLEWARE (order matters!)
// ─────────────────────────────────────────────

// 1. Request ID for tracing
app.use(requestId);

// 2. Security headers
app.use(helmet());

// 3. CORS
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// 4. Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Rate limiting
app.use(generalLimiter);

// 6. HTTP request logging (Morgan → Winston)
const morganFormat = ':method :url :status :res[content-length] - :response-time ms';
app.use(
  morgan(morganFormat, {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);

// ─────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    message: 'LoanForge API is running',
    data: {
      environment: config.env,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// Swagger docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Feature modules
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/kyc', kycRoutes);
app.use('/api/v1/loans', loanRoutes);
app.use('/api/v1/loans', signatureRoutes);       // /loans/:id/sign/*
app.use('/api/v1', repaymentRoutes);              // /loans/:id/repayments + /repayments/:id/pay
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

// PDF download (part of loans module)
const documentController = require('./modules/document/document.controller');
const auth = require('./middleware/auth');
app.get('/api/v1/loans/:id/pdf', auth, documentController.downloadPdf);

// ─────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────

// 404 handler for undefined routes
app.use((_req, _res, next) => {
  next(ApiError.notFound('Route not found'));
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;
