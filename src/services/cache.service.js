const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

/**
 * Redis cache service with graceful degradation.
 * If Redis is unavailable, all operations silently return null/false.
 */
class CacheService {
  /**
   * Get a cached value.
   * @param {string} key
   * @returns {any|null}
   */
  async get(key) {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return null;
      }
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.warn('Cache GET error:', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set a cached value with TTL.
   * @param {string} key
   * @param {any} value - Will be JSON.stringify'd
   * @param {number} ttlSeconds - Time-to-live in seconds
   */
  async set(key, value, ttlSeconds = 300) {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return;
      }
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      logger.warn('Cache SET error:', { key, error: error.message });
    }
  }

  /**
   * Delete a cached value.
   * @param {string} key
   */
  async del(key) {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return;
      }
      await redis.del(key);
    } catch (error) {
      logger.warn('Cache DEL error:', { key, error: error.message });
    }
  }

  /**
   * Delete all keys matching a pattern.
   * @param {string} pattern - e.g., 'dashboard:*'
   */
  async delPattern(pattern) {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return;
      }
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.warn('Cache DEL_PATTERN error:', { pattern, error: error.message });
    }
  }
}

module.exports = new CacheService();
