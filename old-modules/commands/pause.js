const logger = require('../logger');
const discord = require('discord.js');
const { getGuildGlobals } = require('../utils');

module.exports = {
  name: 'pause',
  description: 'Pauses the current songs in the queue.',
  async execute(message, args) {
    const guild_id = message.guild.id;

    const guildGlobal = getGuildGlobals(guild_id);

    logger.info(`Paused playing for ${guild_id}.`);

    if (guildGlobal.dispatcher === null || guildGlobal.queue.length === 0) {
      message.inlineReply(
        'Nothing is playing right now! Go add some songs, sheesh.'
      );
      return;
    }

    guildGlobal.dispatcher.pause();
    const playingSong = guildGlobal.queue[0];
    const pauseEmbed = new discord.MessageEmbed()
      .setColor('#edca1a')
      .setTitle('Paused Playing')
      .setDescription(`[${playingSong.title}](${playingSong.audio})`);
    message.inlineReply(pauseEmbed);
  },
};
