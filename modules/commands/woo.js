const { playAssetAudio } = require('../audio');

module.exports = {
  name: 'woo',
  description: 'Plays woo in the current voice channel.',
  async execute(message, args) {
    playAssetAudio(message, args, 'woo.mp3');
  },
};
