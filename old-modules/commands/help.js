const discord = require('discord.js');
const { getHelpEmbed } = require('../utils');
module.exports = {
  name: 'help',
  description: 'Sends help.',
  async execute(message, args) {
    const helpEmbed = getHelpEmbed(args);
    message.inlineReply(helpEmbed).then(async (sentMessage) => {
      await sentMessage.react('⬅️');
      await sentMessage.react('➡️');
    });
  },
};
