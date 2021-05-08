const logger = require('../logger');
const { getSongString, createAnnounceEmbed } = require('../utils');

module.exports = {
  name: 'resume',
  description: 'Resumes the current song in the queue.',
  ac: null,
  async execute(message, args) {
    const guildID = message.guild.id;
    const guild = this.ac.getGuildObject(guildID);

    logger.info(`Resumed playing for ${guildID}.`);

    if (!guild.audioPlayer.currentSong) {
      message.inlineReply('Nothing is playing right now!');
      return;
    }

    guild.audioPlayer.resume();
    const playingSong = guild.audioPlayer.currentSong;
    const resumeEmbed = createAnnounceEmbed(
      'Resumed Playing',
      getSongString(playingSong),
      '#E0FFFF'
    );
    message.inlineReply(resumeEmbed);
  },
};
