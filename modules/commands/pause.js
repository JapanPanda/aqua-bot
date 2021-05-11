const logger = require('../logger');
const { getSongString, createAnnounceEmbed } = require('../utils');

module.exports = {
  name: 'pause',
  description: 'Pauses the current song in the queue.',
  ac: null,
  async execute(message, args) {
    const guildID = message.guild.id;
    const guild = this.ac.getGuildObject(guildID);

    logger.info(`Paused playing for ${guildID}.`);

    if (!guild.audioPlayer.currentSong) {
      message.inlineReply('Nothing is playing right now!');
      return;
    }

    guild.audioPlayer.pause();
    const playingSong = guild.audioPlayer.currentSong;
    const { verbose } = await this.ac.getGuildSettings(guildID);
    if (verbose) {
      const pauseEmbed = createAnnounceEmbed(
        'Paused Playing',
        getSongString(playingSong),
        '#E0FFFF'
      );
      message.inlineReply(pauseEmbed);
    } else {
      message.react('✅');
    }
  },
};
