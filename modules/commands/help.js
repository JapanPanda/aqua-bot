const { getHelpEmbed } = require('../utils');
module.exports = {
  name: 'help',
  description: 'Sends help.',
  ac: null,
  async execute(message, args) {
    let page = !args[0] ? 1 : parseInt(args[0]);
    const helpEmbed = getHelpEmbed(page);
    message.inlineReply(helpEmbed).then(async (sentMessage) => {
      await sentMessage.react('⬅️');
      await sentMessage.react('➡️');
    });
  },
};
