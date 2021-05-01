const { stop } = require('../audio');

module.exports = {
  name: 'stop',
  description: 'Stops playing in a voice channel.',
  async execute(message, args) {
    stop(message);
  },
};
