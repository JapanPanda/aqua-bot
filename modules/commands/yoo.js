const { playAssetAudio } = require('../audio');

module.exports = {
  name: 'yoo',
  description: 'Plays yoo in the current voice channel.',
  async execute(message, args) {
    playAssetAudio(message, args, 'yoo.mp3');
  },
};
