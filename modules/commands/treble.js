const logger = require('../logger');
const redisClient = require('../redis');
const { createAnnounceEmbed } = require('../utils');

module.exports = {
  name: 'treble',
  description: 'Changes the treble setting.',
  usage:
    '.treble - Displays the current treble setting.\n.treble 5 - Increases the treble by 5 dB.\n.treble -5 - Decreases the treble by 5 dB.',
  ac: null,
  async execute(message, args) {
    const guildID = message.guild.id;
    let guildSettings = await this.ac.getGuildSettings(guildID);

    const treble = guildSettings.treble;

    if (args.length === 0) {
      const embed = createAnnounceEmbed(
        'Treble Setting',
        `The current treble setting is: ${treble} dB.`
      );
      message.inlineReply(embed);
    } else if (args.length === 1) {
      let newTreble = parseFloat(args[0]);
      if (args[0] === 'off') {
        newTreble = 0;
      }
      if (isNaN(newTreble)) {
        const embed = createAnnounceEmbed(
          'Incorrect Usage!',
          `Incorrect usage of treble.\nExample: .treble (5)\nWithout specifying the new treble to set it at, it'll state the current treble setting.`,
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      if (newTreble > 25) {
        const embed = createAnnounceEmbed(
          'TOO MUCH TREBLE',
          'ARE YOU TRYING TO KILL YOUR EARS? THE MAX IS 25 dB',
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      } else if (newTreble < -25) {
        const embed = createAnnounceEmbed(
          'TOO LITTLE TREBLE',
          "YOU CAN'T EVEN HEAR ANYTHING AT THIS POINT, THE LOWEST IS -25",
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      guildSettings.treble = newTreble;

      redisClient.set(guildID, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(`Error setting treble.\n${err}`);
          return;
        }

        logger.info(`Modified treble for ${guildID} to be ${newTreble}`);
      });

      const verbose = guildSettings.verbose;
      if (verbose) {
        const embed = createAnnounceEmbed(
          'Treble Set Successfully!',
          `Set the treble setting to: ${newTreble} dB.`
        );
        message.inlineReply(embed);
      } else {
        message.react('✅');
      }
    } else {
      const embed = createAnnounceEmbed(
        'Incorrect Usage!',
        `Incorrect usage of .treble.\nExample: .treble (50)\nWithout specifying the new treble to set it at, it'll state the current treble setting.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
    }
  },
};
