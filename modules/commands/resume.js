const logger = require('../logger');
const discord = require('discord.js');
const { getGuildGlobals } = require('../utils');

module.exports = {
  name: 'resume',
  description: 'Resumes the current songs in the queue.',
  async execute(message, args) {
    const guild_id = message.guild.id;

    const guildGlobal = getGuildGlobals(guild_id);

    logger.info(`Resumed playing for ${guild_id}.`);

    if (guildGlobal.dispatcher === null || guildGlobal.queue.length === 0) {
      message.inlineReply(
        'Nothing is playing right now! Go add some songs, sheesh.'
      );
      return;
    }

    // hacky fix since there's a bug in discord.js
    guildGlobal.dispatcher.resume();
    guildGlobal.dispatcher.pause();
    guildGlobal.dispatcher.resume();

    const playingSong = guildGlobal.queue[0];
    const resumeEmbed = new discord.MessageEmbed()
      .setColor('#edca1a')
      .setTitle('Resumed Playing')
      .setDescription(`[${playingSong.title}](${playingSong.audio})`);
    message.inlineReply(resumeEmbed);
  },
};
