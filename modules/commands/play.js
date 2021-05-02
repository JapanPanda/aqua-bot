const { queueAudio } = require('../audio');

module.exports = {
  name: 'play',
  description: 'Plays a youtube video in the current voice channel.',
  async execute(message, args) {
    queueAudio(message, args, false);
  },
};
