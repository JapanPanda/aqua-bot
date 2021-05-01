const logger = require('./logger');

const { promisifyAll } = require('bluebird');

const redis = require('redis');

promisifyAll(redis);

const client = redis.createClient({
  host: '127.0.0.1',
  port: '1337',
});

logger.info('Initialized redis-server');

module.exports = client;
