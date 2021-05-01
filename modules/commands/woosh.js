const { playAssetAudio } = require('../audio');

module.exports = {
  name: 'woosh',
  description: 'Plays woosh in the current voice channel.',
  async execute(message, args) {
    playAssetAudio(message, args, 'woosh.mp3');
  },
};
