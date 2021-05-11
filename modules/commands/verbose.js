const logger = require('../logger');
const redisClient = require('../redis');
const { createAnnounceEmbed } = require('../utils');

module.exports = {
  name: 'verbose',
  description:
    'Changes the verbose setting. Verbose off would make the bot less spammy.',
  usage: '.verbose [off/on]',
  ac: null,
  async execute(message, args) {
    const guildID = message.guild.id;
    let guildSettings = await this.ac.getGuildSettings(guildID);

    const verbose = guildSettings.verbose;

    if (args.length === 0) {
      const embed = createAnnounceEmbed(
        'Verbose Setting',
        `The current verbose setting is: ${verbose ? 'on' : 'off'}.`
      );
      message.inlineReply(embed);
    } else if (args.length === 1) {
      const newVerbose = args[0].toLowerCase();

      if (newVerbose !== 'on' && newVerbose !== 'off') {
        const embed = createAnnounceEmbed(
          'Incorrect Usage!',
          `Incorrect usage of verbose.\nExample: verbose on/off\nWithout specifying the new verbose setting to set it at, it'll state the current verbose setting.`,
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      guildSettings.verbose = newVerbose === 'on';

      redisClient.set(guildID, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(`Error setting verbose.\n${err}`);
          return;
        }

        logger.info(`Modified verbose for ${guildID} to be ${newVerbose}`);
      });
      if (newVerbose === 'on') {
        const embed = createAnnounceEmbed(
          'Verbose Set Successfully!',
          `Set the verbose setting to: ${newVerbose}.`,
          '#E0FFFF'
        );
        message.inlineReply(embed);
      } else {
        message.react('✅');
      }
    } else {
      const embed = createAnnounceEmbed(
        'Incorrect Usage!',
        `Incorrect usage of verbose.\nExample: verbose on/off\nWithout specifying the new verbose setting to set it at, it'll state the current verbose setting.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
    }
  },
};
