const { queueAudio } = require('../audio');

module.exports = {
  name: 'yoo',
  description: 'Plays yoo in the current voice channel.',
  async execute(message, args) {
    queueAudio(message, ['yoo.mp3'], true);
  },
};
