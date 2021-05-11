const logger = require('../logger');
const { createAnnounceEmbed } = require('../utils');

module.exports = {
  name: 'stop',
  description: 'Stops playing in a voice channel.',
  ac: null,
  async execute(message, args) {
    const guild_id = message.guild.id;
    const guild = this.ac.getGuildObject(guild_id);

    if (
      message.guild.me.voice.channel &&
      message.member.voice.channel.id === message.guild.me.voice.channel.id
    ) {
      logger.info(`Stopped playing for ${guild_id}.`);
      await guild.audioPlayer.leave();
      return;
    }

    const embed = createAnnounceEmbed(
      'Not in a voice channel',
      'Please use .stop while in the same voice channel as the bot.',
      '#ffbaba'
    );
    message.inlineReply(embed);
  },
};
