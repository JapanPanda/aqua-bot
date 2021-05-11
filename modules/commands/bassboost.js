const logger = require('../logger');
const redisClient = require('../redis');
const { createAnnounceEmbed } = require('../utils');

module.exports = {
  name: 'bassboost',
  description: 'Changes the bassboost setting.',
  usage:
    '.bassboost - Displays the current bassboost setting.\n.bassboost 5 - Increases the bass by 5 dB.\n.bassboost -5 - Decreases the bass by 5 dB.',
  ac: null,
  async execute(message, args) {
    const guildID = message.guild.id;
    let guildSettings = await this.ac.getGuildSettings(guildID);

    const bassboost = guildSettings.bassboost;

    if (args.length === 0) {
      const embed = createAnnounceEmbed(
        'Bassboost Setting',
        `The current bassboost setting is: ${bassboost} dB.`
      );
      message.inlineReply(embed);
    } else if (args.length === 1) {
      let newBassboost = parseFloat(args[0]);
      if (args[0] === 'off') {
        newBassboost = 0;
      }
      if (isNaN(newBassboost)) {
        const embed = createAnnounceEmbed(
          'Incorrect Usage!',
          `Incorrect usage of .bassboost.\nExample: .bassboost (5)\nWithout specifying the new bassboost to set it at, it'll state the current bassboost setting.`,
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      if (newBassboost > 25) {
        const embed = createAnnounceEmbed(
          'TOO MUCH BASS',
          'ARE YOU TRYING TO KILL YOUR EARS? THE MAX IS 25 dB',
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      } else if (newBassboost < -25) {
        const embed = createAnnounceEmbed(
          'TOO LITTLE BASS',
          "YOU CAN'T EVEN HEAR ANYTHING AT THIS POINT, THE LOWEST IS -25",
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      guildSettings.bassboost = newBassboost;

      redisClient.set(guildID, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(`Error setting bassboost.\n${err}`);
          return;
        }

        logger.info(`Modified bassboost for ${guildID} to be ${newBassboost}`);
      });
      const verbose = guildSettings.verbose;
      if (verbose) {
        const embed = createAnnounceEmbed(
          'Bassboost Set Successfully!',
          `Set the bassboost setting to: ${newBassboost} dB.`
        );
        message.inlineReply(embed);
      } else {
        message.react('✅');
      }
    } else {
      const embed = createAnnounceEmbed(
        'Incorrect Usage!',
        `Incorrect usage of .bassboost.\nExample: .bassboost 5\nWithout specifying the new bassboost to set it at, it'll state the current bassboost setting.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
    }
  },
};
