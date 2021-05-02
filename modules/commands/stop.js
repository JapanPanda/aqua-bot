const globals = require('../globals');
const logger = require('../logger');

module.exports = {
  name: 'stop',
  description: 'Stops playing in a voice channel.',
  async execute(message, args) {
    const guild_id = message.guild.id;
    if (globals.queues[guild_id] !== undefined) {
      globals.queues[guild_id] = [];
    }

    if (
      globals.dispatchers[guild_id] !== undefined &&
      globals.dispatchers[guild_id] !== null
    ) {
      if (
        message.member.voice.channel.id === message.guild.me.voice.channel.id
      ) {
        logger.info(`Stopped playing for ${guild_id}!`);
        message.guild.me.voice.channel.leave();
      }
      delete globals.dispatchers[guild_id];
    }
  },
};
