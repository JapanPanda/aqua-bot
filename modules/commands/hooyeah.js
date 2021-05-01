const { playAssetAudio } = require('../audio');

module.exports = {
  name: 'hoyeah',
  description: 'Plays hoyeah in the current voice channel.',
  async execute(message, args) {
    playAssetAudio(message, args, 'hoyeah.mp3');
  },
};
