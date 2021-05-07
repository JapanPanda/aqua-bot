const { queueAudio } = require('../audio');

module.exports = {
  name: 'deez',
  description: 'Plays deez nuts in the current voice channel.',
  async execute(message, args) {
    queueAudio(message, ['deez.mp3'], true);
  },
};
