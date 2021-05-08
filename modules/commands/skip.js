const logger = require('../logger');
const { createAnnounceEmbed } = require('../utils');

module.exports = {
  name: 'skip',
  description: 'Skips songs in the queue.',
  usage:
    '.skip - Skips the current song.\n.skip 3 - Skips the next three songs in the queue (including the currently playing song).',
  ac: null,
  async execute(message, args) {
    const guildID = message.guild.id;

    const guild = this.ac.getGuildObject(guildID);

    if (!guild.audioPlayer.currentSong) {
      message.inlineReply('Queue is already empty!');
      return;
    }

    if (args.length > 1) {
      message.inlineReply('Incorrect usage, $skip [index to skip to].');
      return;
    }

    let skipIndex = args.length === 0 ? 1 : parseInt(args[0]);
    if (skipIndex < 1 || skipIndex > guild.audioPlayer.queue.length + 1) {
      message.inlineReply(
        `Must choose an index between 1 and ${
          guild.audioPlayer.queue.length + 1
        } inclusive.`
      );
    }

    guild.audioPlayer.skip(skipIndex);

    logger.info(`Skipped ${skipIndex} songs for ${guildID}.`);
    const skippedEmbed = createAnnounceEmbed(
      'Skipped Songs',
      `Skipped ${skipIndex} songs.`,
      '#E0FFFF'
    );
    message.inlineReply(skippedEmbed);
  },
};
