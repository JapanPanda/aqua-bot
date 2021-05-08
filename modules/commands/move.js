const { createAnnounceEmbed, getSongString } = require('../utils');

module.exports = {
  name: 'move',
  description: 'Moves a song in the queue to a new position.',
  usage:
    '.move 5 2 - Moves the song at position 5 in the queue to position 2, shifting the queue.',
  ac: null,
  async execute(message, args) {
    if (args.length !== 2) {
      const embed = createAnnounceEmbed(
        'Incorrect Usage',
        'Incorrect usage, $move [original] [new]',
        '#ffbaba'
      );
      message.inlineReply(embed);
      return;
    }

    const guildID = message.guild.id;
    const guild = this.ac.getGuildObject(guildID);
    let queue = guild.audioPlayer.queue;

    if (queue.length === 0) {
      const embed = createAnnounceEmbed(
        'Nothing is playing in the queue',
        'Add some more songs to the queue!',
        '#ffbaba'
      );
      message.inlineReply(embed);
      return;
    }

    const originalIndex = args[0];
    const newIndex = args[1];
    if (originalIndex < 1 || originalIndex > queue.length) {
      const embed = createAnnounceEmbed(
        'Original Index Error',
        `The original index must be between 1 and ${queue.length}.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
      return;
    } else if (newIndex < 1 || newIndex > queue.length + 1) {
      const embed = createAnnounceEmbed(
        'New Index Error',
        `The new index must be between 1 and ${queue.length + 1}`,
        '#ffbaba'
      );
      message.inlineReply(embed);
      return;
    }

    // remove original element and store it
    let song = guild.audioPlayer.queue.splice(originalIndex - 1, 1)[0];
    let songString = getSongString(song);

    // splice original element into new index
    guild.audioPlayer.queue.splice(newIndex - 1, 0, song);

    const embed = createAnnounceEmbed(
      'Successfully Moved Song',
      `Successfully moved ${songString} to position ${newIndex}.`,
      '#E0FFFF'
    );

    message.inlineReply(embed);
  },
};
