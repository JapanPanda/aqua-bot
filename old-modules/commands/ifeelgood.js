const { queueAudio } = require('../audio');

module.exports = {
  name: 'ifeelgood',
  description: 'Plays I Feel Good in the current voice channel.',
  async execute(message, args) {
    queueAudio(message, ['ifeelgood.mp3'], true);
  },
};
