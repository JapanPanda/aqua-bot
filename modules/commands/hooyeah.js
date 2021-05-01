const playAudio = require('../playAudio');

module.exports = {
  name: 'hoyeah',
  description: 'Plays hoyeah in the current voice channel.',
  async execute(message, args) {
    playAudio(message, args, 'hoyeah.mp3');
  },
};
