const { createAnnounceEmbed, getSongString } = require('../utils');

module.exports = {
  name: 'remove',
  description: 'Removes a song from queue.',
  usage: '.remove 3 - Removes the song at position 3 in the queue.',
  ac: null,
  async execute(message, args) {
    if (args.length !== 1) {
      const embed = createAnnounceEmbed(
        'Incorrect Usage',
        'Incorrect usage, $remove [index in queue]',
        '#ffbaba'
      );
      message.inlineReply(embed);
      return;
    }

    const guildID = message.guild.id;
    const guild = this.ac.getGuildObject(guildID);

    if (guild.audioPlayer.queue.length === 0) {
      const embed = createAnnounceEmbed(
        'Nothing is playing in the queue',
        'Add some more songs to the queue!',
        '#ffbaba'
      );
      message.inlineReply(embed);
      return;
    }

    const index = parseInt(args[0]);
    if (index < 1 || index > guild.audioPlayer.queue.length) {
      const embed = createAnnounce(
        'Remove Index Error',
        `The index must be between 1 and ${guildGlobals.queue.length}.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
      return;
    }

    let song = guild.audioPlayer.queue.splice(index - 1, 1)[0];

    const { verbose } = await this.ac.getGuildSettings(guildID);
    if (verbose) {
      const removeEmbed = createAnnounceEmbed(
        'Removed Successfully',
        `Successfully removed the song ${getSongString(song)}.`,
        '#E0FFFF'
      );
      message.inlineReply(removeEmbed);
    } else {
      message.react('✅');
    }
  },
};
