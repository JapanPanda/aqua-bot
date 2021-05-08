const logger = require('../logger');
const redisClient = require('../redis');
const { createAnnounceEmbed } = require('../utils');

module.exports = {
  name: 'nightcore',
  description: 'Changes nightcore setting.',
  usage:
    '.nightcore - Displays the current nightcore setting.\n.nightcore [off/on]',
  ac: null,
  async execute(message, args) {
    const guildID = message.guild.id;
    const guildSettings = this.ac.getGuildSettings(guildID);
    const nightcore = guildSettings.nightcore;

    if (args.length === 0) {
      const embed = createAnnounceEmbed(
        'Nightcore Setting',
        `The current nightcore setting is: ${nightcore ? 'on' : 'off'}.`
      );
      message.inlineReply(embed);
    } else if (args.length === 1) {
      const newNightcore = args[0];

      if (newNightcore !== 'on' && newNightcore !== 'off') {
        const embed = createAnnounceEmbed(
          'Incorrect Usage!',
          `Incorrect usage of $nightcore.\nExample: $nightcore on/off\nWithout specifying the new nightcore setting to set it at, it'll state the current nightcore setting.`,
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      guildSettings.nightcore = newNightcore === 'on';

      redisClient.set(guildID, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(`Error setting nightcore.\n${err}`);
          return;
        }

        logger.info(`Modified nightcore for ${guildID} to be ${nightcore}`);
      });
      const embed = createAnnounceEmbed(
        'Nightcore Set Successfully!',
        `Set the nightcore setting to: ${newNightcore}.`
      );
      message.inlineReply(embed);
    } else {
      const embed = createAnnounceEmbed(
        'Incorrect Usage!',
        `Incorrect usage of $nightcore.\nExample: $nightcore on/off\nWithout specifying the new nightcore setting to set it at, it'll state the current nightcore setting.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
    }
  },
};
