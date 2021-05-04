const { queueAudio } = require('../audio');

module.exports = {
  name: 'play',
  description: 'Plays a youtube video in the current voice channel.',
  async execute(message, args) {
    if (args.length === 0) {
      message.inlineReply(
        'Incorrect usage, $play [youtube link or search query]'
      );
      return;
    }
    queueAudio(message, args, false);
  },
};
