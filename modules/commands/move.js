const { createAnnounce, getGuildGlobals, getSongString } = require('../utils');

module.exports = {
  name: 'move',
  description: 'Moves a song in the queue to a new position.',
  async execute(message, args) {
    if (args.length !== 2) {
      const embed = createAnnounce(
        'Incorrect Usage',
        'Incorrect usage, $move [original] [new]',
        '#ffbaba'
      );
      message.inlineReply(embed);
      return;
    }
    const guild_id = message.guild.id;
    const guildGlobal = getGuildGlobals(guild_id);
    let queue = guildGlobal.queue;

    if (queue.length - 1 <= 0) {
      const embed = createAnnounce(
        'Nothing is playing in the queue',
        'Add some more songs to the queue, sheesh!',
        '#ffbaba'
      );
      message.inlineReply(embed);
      return;
    }

    const originalIndex = args[0];
    const newIndex = args[1];
    if (originalIndex < 1 || originalIndex > queue.length - 1) {
      const embed = createAnnounce(
        'Original Index Error',
        `The original index must be between 1 and ${queue.length - 1}.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
      return;
    } else if (newIndex < 1 || newIndex > queue.length) {
      const embed = createAnnounce(
        'New Index Error',
        `The new index must be between 1 and ${queue.length}`,
        '#ffbaba'
      );
    }

    // remove original element and store it
    let song = guildGlobal.queue.splice(originalIndex, 1)[0];
    let songString = getSongString(song);

    // splice original element into new index
    guildGlobal.queue.splice(newIndex, 0, song);

    const embed = createAnnounce(
      'Successfully Moved Song',
      `Successfully moved ${songString} to position ${newIndex}`
    );

    message.inlineReply(embed);
  },
};
