const { queueAudio } = require('../audio');
const { getGuildGlobals, createAnnounce, getSongString } = require('../utils');

module.exports = {
  name: 'remove',
  description: 'Removes a song from queue.',
  usage: '.remove 3 - Removes the song at position 3 in the queue.',
  async execute(message, args) {
    if (args.length !== 1) {
      const embed = createAnnounce(
        'Incorrect Usage',
        'Incorrect usage, $remove [index in queue]',
        '#ffbaba'
      );
      message.inlineReply(embed);
      return;
    }

    const guild_id = message.guild.id;
    const guildGlobals = getGuildGlobals(guild_id);

    const index = parseInt(args[0]);
    if (index < 1 || index > guildGlobals.queue.length - 1) {
      const embed = createAnnounce(
        'Remove Index Error',
        `The index must be between 1 and ${guildGlobals.queue.length - 1}.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
      return;
    }

    let song = guildGlobals.queue.splice(index, 1)[0];

    const removeEmbed = createAnnounce(
      'Removed Successfully',
      `Successfully removed the song ${getSongString(song)}.`
    );
    message.inlineReply(removeEmbed);
  },
};
