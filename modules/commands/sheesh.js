const { playAssetAudio } = require('../audio');

module.exports = {
  name: 'sheesh',
  description: 'Plays sheesh in the current voice channel.',
  async execute(message, args) {
    playAssetAudio(message, args, 'sheesh.mp3');
  },
};
