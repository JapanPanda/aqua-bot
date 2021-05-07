const logger = require('./logger');

const { promisifyAll } = require('bluebird');

const redis = require('redis');

promisifyAll(redis);

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

client.on('error', (err) => {
  logger.error(`Error initializing redis-server.\n${err.stack}`);
  process.exit(-1);
});

client.on('ready', () => {
  logger.info('Initialized redis-server');
});

module.exports = client;
