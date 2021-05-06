const globals = require('../globals');
const logger = require('../logger');

const redisClient = require('../redis');

const {
  getGuildGlobals,
  getGuildSettings,
  createAnnounce,
} = require('../utils');

module.exports = {
  name: 'bassboost',
  description: 'Changes the bassboost setting.',
  usage:
    '.bassboost - Displays the current bassboost setting.\n.bassboost 5 - Increases the bass by 5 dB.\n.bassboost -5 - Decreases the bass by 5 dB.',
  async execute(message, args) {
    const guild_id = message.guild.id;
    let guildSettings = await getGuildSettings(guild_id);

    const bassboost = guildSettings.bassboost;

    if (args.length === 0) {
      const embed = createAnnounce(
        'Bassboost Setting',
        `Sheesh, the current bassboost setting is: ${bassboost} dB.`
      );
      message.inlineReply(embed);
    } else if (args.length === 1) {
      const newBassboost = parseFloat(args[0]);

      if (isNaN(newBassboost)) {
        const embed = createAnnounce(
          'Incorrect Usage!',
          `Incorrect usage of $bassboost.\nExample: $bassboost (5)\nWithout specifying the new bassboost to set it at, it'll state the current bassboost setting.`,
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      if (newBassboost > 25) {
        const embed = createAnnounce(
          'TOO MUCH BASS',
          'ARE YOU TRYING TO KILL YOUR EARS? THE MAX IS 25 dB',
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      } else if (newBassboost < -25) {
        const embed = createAnnounce(
          'TOO LITTLE BASS',
          "YOU CAN'T EVEN HEAR ANYTHING AT THIS POINT, THE LOWEST IS -25",
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      guildSettings.bassboost = newBassboost;

      const guildGlobal = getGuildGlobals(guild_id);

      redisClient.set(guild_id, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(`Error setting bassboost.\n${err}`);
          return;
        }

        logger.info(`Modified bassboost for ${guild_id} to be ${newBassboost}`);
      });
      const embed = createAnnounce(
        'Bassboost Set Successfully!',
        `Sheesh, set the bassboost setting to: ${newBassboost} dB.`
      );
      message.inlineReply(embed);
    } else {
      const embed = createAnnounce(
        'Incorrect Usage!',
        `Incorrect usage of $bassboost.\nExample: $bassboost (50)\nWithout specifying the new bassboost to set it at, it'll state the current bassboost setting.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
    }
  },
};
