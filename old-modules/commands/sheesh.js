const { queueAudio } = require('../audio');

module.exports = {
  name: 'sheesh',
  description: 'Plays sheesh in the current voice channel.',
  async execute(message, args) {
    queueAudio(message, ['sheesh.mp3'], true);
  },
};
