const { queueAudio } = require('../audio');

module.exports = {
  name: 'aaa',
  description: 'Plays aaa in the current voice channel.',
  async execute(message, args) {
    queueAudio(message, ['aaa.mp3'], true);
  },
};
