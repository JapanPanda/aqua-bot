const playAudio = require('../playAudio');

module.exports = {
  name: 'sheesh',
  description: 'Plays sheesh in the current voice channel.',
  async execute(message, args) {
    playAudio(message, args, 'sheesh.mp3');
  },
};
