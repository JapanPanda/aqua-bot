const logger = require('../logger');
const redisClient = require('../redis');
const { createAnnounceEmbed } = require('../utils');

module.exports = {
  name: 'shuffle',
  description: 'Changes the shuffle setting.',
  usage: '.shuffle [off/on]',
  ac: null,
  async execute(message, args) {
    const guildID = message.guild.id;
    let guildSettings = await this.ac.getGuildSettings(guildID);

    const shuffle = guildSettings.shuffle;

    if (args.length === 0) {
      const embed = createAnnounceEmbed(
        'Shuffle Setting',
        `The current shuffle setting is: ${shuffle ? 'on' : 'off'}.`
      );
      message.inlineReply(embed);
    } else if (args.length === 1) {
      const newShuffle = args[0].toLowerCase();

      if (newShuffle !== 'on' && newShuffle !== 'off') {
        const embed = createAnnounceEmbed(
          'Incorrect Usage!',
          `Incorrect usage of shuffle.\nExample: $shuffle on/off\nWithout specifying the new shuffle setting to set it at, it'll state the current shuffle setting.`,
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      guildSettings.shuffle = newShuffle === 'on';

      redisClient.set(guildID, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(`Error setting shuffle.\n${err}`);
          return;
        }

        logger.info(`Modified shuffle for ${guildID} to be ${newShuffle}`);
      });
      const embed = createAnnounceEmbed(
        'Shuffle Set Successfully!',
        `Set the shuffle setting to: ${newShuffle}.`,
        '#E0FFFF'
      );
      message.inlineReply(embed);
    } else {
      const embed = createAnnounceEmbed(
        'Incorrect Usage!',
        `Incorrect usage of $shuffle.\nExample: shuffle on/off\nWithout specifying the new shuffle setting to set it at, it'll state the current shuffle setting.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
    }
  },
};
