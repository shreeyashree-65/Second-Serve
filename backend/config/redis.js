const Redis = require('ioredis');

let redisClient = null;

const connectRedis = () => {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    redisClient.on('connect', () => {
      console.log('Redis Connected Successfully');
    });

    redisClient.on('error', (err) => {
      console.error('Redis Connection Error:', err.message);
    });

  } catch (error) {
    console.error('Redis Setup Error:', error.message);
  }
};

const getRedisClient = () => {
  return redisClient;
};

module.exports = connectRedis;
module.exports.getRedisClient = getRedisClient;