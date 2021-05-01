const { playAssetAudio } = require('../audio');

module.exports = {
  name: 'deez',
  description: 'Plays deez nuts in the current voice channel.',
  async execute(message, args) {
    playAssetAudio(message, args, 'deez.mp3');
  },
};
