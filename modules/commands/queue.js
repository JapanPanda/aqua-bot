const logger = require('../logger');
const globals = require('../globals');

const discord = require('discord.js');

const { getGuildGlobals } = require('../utils');

module.exports = {
  name: 'queue',
  description: 'Shows the queue of songs currently.',
  async execute(message, args) {
    const guild_id = message.guild.id;

    if (
      globals.guilds[guild_id] === undefined ||
      globals.guilds[guild_id].queue.length === 0
    ) {
      const queueString = 'The queue is currently empty!';
      const queueEmbed = new discord.MessageEmbed()
        .setColor('#edca1a')
        .addFields({
          name: 'Current Queue',
          value: '```' + queueString + '```',
        });

      message.channel.send(queueEmbed);
      return;
    }

    const guildGlobal = getGuildGlobals(guild_id);

    const queue = guildGlobal.queue;

    let queueString = queue.reduce((acc, ele, i) => {
      console.log(i);
      console.log(acc);
      if (i === 1) {
        acc = '';
      }

      if (ele.isPredefined) {
        return acc + `**${i}**. ${ele.title}\n`;
      }

      return acc + `**${i}**. [${ele.title}](${ele.audio[0]})\n`;
    });

    let currPlayString = `[${queue[0].title}](${queue[0].audio[0]})`;

    if (queue.length === 1 || queueString === '') {
      queueString = 'The queue is currently empty!';
    }

    const queueEmbed = new discord.MessageEmbed()
      .setColor('#edca1a')
      .addFields({ name: 'Currently Playing', value: currPlayString })
      .addFields({ name: 'Current Queue', value: queueString });

    message.channel.send(queueEmbed);
  },
};
