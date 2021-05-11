const logger = require('../logger');
const redisClient = require('../redis');
const { createAnnounceEmbed } = require('../utils');

module.exports = {
  name: '3d',
  description: 'Makes the audio 3d (rotate).',
  usage:
    '.3d - Displays the current 3d setting.\n.3d 5 - Rotate the song every 5 seconds.',
  ac: null,
  async execute(message, args) {
    const guildID = message.guild.id;
    let guildSettings = await this.ac.getGuildSettings(guildID);

    const rotate = guildSettings.rotate;

    if (args.length === 0) {
      const embed = createAnnounceEmbed(
        '3d Setting',
        `The current 3d setting is: ${rotate} seconds.`
      );
      message.inlineReply(embed);
    } else if (args.length === 1) {
      let newRotate = parseFloat(args[0]);
      if (args[0] === 'off') {
        newRotate = 0;
      }
      if (isNaN(newRotate)) {
        const embed = createAnnounceEmbed(
          'Incorrect Usage!',
          `Incorrect usage of .3d.\nExample: $3d 5 - Rotates the audio every 5 seconds.\nWithout specifying the new seconds to set it at, it'll state the current 3d setting.`,
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      if (newRotate >= 300) {
        const embed = createAnnounceEmbed(
          '3d Settings Error',
          'The max is 300, sorry!',
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      } else if (newRotate < 0) {
        const embed = createAnnounceEmbed(
          '3d Settings Error',
          'The minimum is 0, sorry!',
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      guildSettings.rotate = newRotate;

      redisClient.set(guildID, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(`Error setting rotate.\n${err}`);
          return;
        }

        logger.info(`Modified rotate for ${guildID} to be ${newRotate}`);
      });

      const verbose = guildSettings.verbose;
      if (verbose) {
        const embed = createAnnounceEmbed(
          '3d Set Successfully!',
          `Set the 3d setting to: ${newRotate} seconds.`
        );
        message.inlineReply(embed);
      } else {
        message.react('✅');
      }
    } else {
      const embed = createAnnounceEmbed(
        'Incorrect Usage!',
        `Incorrect usage of .3d.\nExample: .3d 5\nWithout specifying the new seconds to set it at, it'll state the current 3d setting.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
    }
  },
};
