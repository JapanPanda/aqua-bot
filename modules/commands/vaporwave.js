const logger = require('../logger');
const redisClient = require('../redis');
const { createAnnounceEmbed } = require('../utils');

module.exports = {
  name: 'vaporwave',
  description: 'Changes vaporwave setting.',
  usage:
    '.vaporwave - Displays the current vaporwave setting.\n.vaporwave [off/on]',
  ac: null,
  async execute(message, args) {
    const guildID = message.guild.id;
    const guildSettings = await this.ac.getGuildSettings(guildID);
    const vaporwave = guildSettings.vaporwave;

    if (args.length === 0) {
      const embed = createAnnounceEmbed(
        'Vaporwave Setting',
        `The current vaporwave setting is: ${vaporwave ? 'on' : 'off'}.`
      );
      message.inlineReply(embed);
    } else if (args.length === 1) {
      const newVaporwave = args[0];

      if (newVaporwave !== 'on' && newVaporwave !== 'off') {
        const embed = createAnnounceEmbed(
          'Incorrect Usage!',
          `Incorrect usage of vaporwave.\nExample: vaporwave on/off\nWithout specifying the new vaporwave setting to set it at, it'll state the current vaporwave setting.`,
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      guildSettings.vaporwave = newVaporwave === 'on';
      guildSettings.nightcore = false;
      redisClient.set(guildID, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(`Error setting vaporwave.\n${err}`);
          return;
        }

        logger.info(`Modified vaporwave for ${guildID} to be ${newVaporwave}`);
      });
      const verbose = guildSettings.verbose;
      if (verbose) {
        const embed = createAnnounceEmbed(
          'Vaporwave Set Successfully!',
          `Set the vaporwave setting to: ${newVaporwave}.`
        );
        message.inlineReply(embed);
      } else {
        message.react('✅');
      }
    } else {
      const embed = createAnnounceEmbed(
        'Incorrect Usage!',
        `Incorrect usage of vaporwave.\nExample: vaporwave on/off\nWithout specifying the new vaporwave setting to set it at, it'll state the current vaporwave setting.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
    }
  },
};
