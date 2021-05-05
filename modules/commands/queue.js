const logger = require('../logger');
const globals = require('../globals');

const discord = require('discord.js');

const { getQueueEmbed } = require('../utils');

module.exports = {
  name: 'queue',
  description: 'Shows the queue of songs currently.',
  async execute(message, args) {
    const guild_id = message.guild.id;

    const queueEmbed = await getQueueEmbed(args, guild_id);
    message.channel.send(queueEmbed).then(async (sentMessage) => {
      if (
        globals.guilds[guild_id] === undefined ||
        globals.guilds[guild_id].queue.length === 0
      ) {
        return;
      }
      await sentMessage.react('⬅️');
      await sentMessage.react('➡️');
    });
  },
};
