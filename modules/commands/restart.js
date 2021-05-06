const logger = require('../logger');
const discord = require('discord.js');
const { getGuildGlobals } = require('../utils');

module.exports = {
  name: 'restart',
  description: 'Restarts the current song in the queue.',
  async execute(message, args) {
    const guild_id = message.guild.id;

    const guildGlobal = getGuildGlobals(guild_id);

    if (guildGlobal.queue.length === 0) {
      message.inlineReply('Queue is already empty! Add some songs, sheesh.');
      return;
    }

    logger.info(`Restarted the current song for ${guild_id}.`);

    if (skipIndex !== 1) {
      guildGlobal.queue.splice(1, skipIndex - 1);
    }

    guildGlobal.dispatcher.destroy();
    const skippedEmbed = new discord.MessageEmbed().setColor('#edca1a');
    message.inlineReply(skippedEmbed);
  },
};
