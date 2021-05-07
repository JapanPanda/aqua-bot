const logger = require('../logger');
const discord = require('discord.js');
const { getGuildGlobals, getGuildSettings } = require('../utils');

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

    guildGlobal.restart = true;

    await guildGlobal.dispatcher.destroy();

    const skippedEmbed = new discord.MessageEmbed()
      .setColor('#edca1a')
      .setDescription('Restarted the current song!');
    message.inlineReply(skippedEmbed);
  },
};
