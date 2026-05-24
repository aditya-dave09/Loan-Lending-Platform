const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

// Singleton Prisma client
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'stdout' },
          { level: 'warn', emit: 'stdout' },
        ]
      : [{ level: 'error', emit: 'stdout' }],
});

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query} — Duration: ${e.duration}ms`);
  });
}

module.exports = prisma;
