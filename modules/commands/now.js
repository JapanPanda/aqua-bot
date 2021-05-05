const { queueAudio } = require('../audio');
const { createAnnounce, getGuildGlobals } = require('../utils');

module.exports = {
  name: 'now',
  description:
    'Plays a youtube video and adds it to the front of the queue in the current voice channel.',
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
    queueAudio(message, args, false, true);
  },
};
