const { queueAudio } = require('../audio');

module.exports = {
  name: 'woo',
  description: 'Plays woo in the current voice channel.',
  async execute(message, args) {
    queueAudio(message, ['woo.mp3'], true);
  },
};
