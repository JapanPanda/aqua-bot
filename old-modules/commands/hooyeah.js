const { queueAudio } = require('../audio');

module.exports = {
  name: 'hoyeah',
  description: 'Plays hoyeah in the current voice channel.',
  async execute(message, args) {
    queueAudio(message, ['hoyeah.mp3'], true);
  },
};
