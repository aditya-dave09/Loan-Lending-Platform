const Redis = require('ioredis');
const config = require('./index');
const logger = require('./logger');

let redis = null;

/**
 * Get or create Redis client singleton.
 * Returns null if Redis is unavailable (graceful degradation).
 */
function getRedisClient() {
  if (redis) {
    return redis;
  }

  try {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn('Redis: max retries reached, giving up');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redis.on('connect', () => {
      logger.info('Redis: connected');
    });

    redis.on('error', (err) => {
      logger.error('Redis: connection error', { error: err.message });
    });

    return redis;
  } catch (err) {
    logger.warn('Redis: failed to initialize', { error: err.message });
    return null;
  }
}

module.exports = { getRedisClient };
