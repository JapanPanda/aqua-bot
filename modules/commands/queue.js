const logger = require('../logger');

const { getQueueEmbed } = require('../utils');

module.exports = {
  name: 'queue',
  description: 'Shows the queue of songs currently.',
  usage:
    '.queue - Displays the queue. React to the arrow to turn the pages.\n.queue 2 - Goes to the second page of the queue.',
  ac: null,
  async execute(message, args) {
    const guildID = message.guild.id;
    const guild = this.ac.getGuildObject(guildID);

    let page = !args[0] ? 1 : parseInt(args[0]);
    let maxPage = Math.ceil(guild.audioPlayer.queue.length / 5);
    if (page < 1) {
      page = 1;
    } else if (page > maxPage) {
      page = maxPage;
    }

    const guildSettings = await this.ac.getGuildSettings(guildID);
    const queueEmbed = await getQueueEmbed(
      guild.audioPlayer,
      page,
      guildSettings
    );
    message.inlineReply(queueEmbed).then(async (sentMessage) => {
      if (guild.audioPlayer.queue.length > 0) {
        await sentMessage.react('⬅️');
        await sentMessage.react('➡️');
      }
    });
  },
};
