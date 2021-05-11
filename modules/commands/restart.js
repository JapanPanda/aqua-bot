const logger = require('../logger');
const { createAnnounceEmbed } = require('../utils');

module.exports = {
  name: 'restart',
  description: 'Restarts the current song in the queue.',
  async execute(message, args) {
    const guildID = message.guild.id;
    const guild = this.ac.getGuildObject(guildID);

    if (guild.audioPlayer.currentSong === null) {
      const embed = createAnnounceEmbed(
        'Nothing is playing',
        'Add some more songs in the queue!',
        '#ffbaba'
      );
      message.inlineReply(embed);
      return;
    }

    logger.info(`Restarted the current song for ${guildID}.`);

    await guild.audioPlayer.restart();

    const { verbose } = await this.ac.getGuildSettings(guildID);
    if (verbose) {
      const restartEmbed = createAnnounceEmbed(
        '',
        'Restarted the current song.',
        '#3AA8C1'
      );
      message.inlineReply(restartEmbed);
    } else {
      message.react('✅');
    }
  },
};
