const { queueAudio } = require('../audio');
const { createAnnounce } = require('../utils');

module.exports = {
  name: 'play',
  description: 'Plays a youtube video in the current voice channel.',
  async execute(message, args) {
    if (args.length === 0) {
      const embed = createAnnounce(
        'Incorrect Usage',
        'Incorrect usage, $play [youtube link or search query]',
        '#ffbaba'
      );
      message.inlineReply(embed);
      return;
    }
    queueAudio(message, args, false);
  },
};
