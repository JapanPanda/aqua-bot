const { queueAudio } = require('../audio');

module.exports = {
  name: 'woosh',
  description: 'Plays woosh in the current voice channel.',
  async execute(message, args) {
    queueAudio(message, ['woosh.mp3'], true);
  },
};
