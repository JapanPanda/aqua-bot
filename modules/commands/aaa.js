const { playAssetAudio } = require('../audio');

module.exports = {
  name: 'aaa',
  description: 'Plays aaa in the current voice channel.',
  async execute(message, args) {
    playAssetAudio(message, args, 'aaa.mp3');
  },
};
