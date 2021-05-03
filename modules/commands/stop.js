const globals = require('../globals');
const logger = require('../logger');

const { getGuildGlobals } = require('../utils');

module.exports = {
  name: 'stop',
  description: 'Stops playing in a voice channel.',
  async execute(message, args) {
    const guild_id = message.guild.id;

    const guildGlobal = getGuildGlobals(guild_id);

    if (
      message.guild.me.voice.channel !== null &&
      message.member.voice.channel.id === message.guild.me.voice.channel.id
    ) {
      logger.info(`Stopped playing for ${guild_id}!`);
      message.guild.me.voice.channel.leave();
    }
    delete globals.guilds[guild_id];
  },
};
