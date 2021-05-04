const logger = require('../logger');
const discord = require('discord.js');
const { getGuildGlobals } = require('../utils');

module.exports = {
  name: 'skip',
  description: 'Skips songs in the queue.',
  async execute(message, args) {
    const guild_id = message.guild.id;

    const guildGlobal = getGuildGlobals(guild_id);

    if (guildGlobal.queue.length === 0) {
      message.inlineReply('Queue is already empty! Add some songs, sheesh.');
      return;
    }

    if (args.length > 1) {
      message.inlineReply('Incorrect usage, $skip [index to skip to].');
      return;
    }

    let skipIndex = args.length === 0 ? 1 : parseInt(args[0]);

    logger.info(`Skipped ${skipIndex} songs for ${guild_id}.`);

    if (skipIndex !== 1) {
      guildGlobal.queue.splice(1, skipIndex - 1);
    }

    guildGlobal.dispatcher.destroy();
    const skippedEmbed = new discord.MessageEmbed()
      .setColor('#edca1a')
      .setTitle('Skipped Song(s)')
      .setDescription(`Skipped ${skipIndex} song(s)`);
    message.inlineReply(skippedEmbed);
  },
};
