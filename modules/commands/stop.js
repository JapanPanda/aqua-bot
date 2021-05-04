const logger = require('../logger');
const discord = require('discord.js');
const { getGuildGlobals } = require('../utils');
const globals = require('../globals');

module.exports = {
  name: 'stop',
  description: 'Stops playing in a voice channel.',
  async execute(message, args) {
    const guild_id = message.guild.id;

    const guildGlobal = getGuildGlobals(guild_id);

    logger.info(`Stopped playing for ${guild_id}.`);
    if (
      message.guild.me.voice.channel !== null &&
      message.member.voice.channel.id === message.guild.me.voice.channel.id
    ) {
      logger.info(`Stopped playing for ${guild_id}!`);
      const stopEmbed = new discord.MessageEmbed()
        .setColor('#edca1a')
        .setTitle('Stopped Playing')
        .setDescription(
          "Sheeeeesh, if you wanted me to leave, why'd you call me anyways?"
        );
      message.inlineReply(stopEmbed);
      message.guild.me.voice.channel.leave();
    }

    delete globals.guilds[guild_id];
  },
};
