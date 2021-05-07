const globals = require('../globals');
const logger = require('../logger');

const redisClient = require('../redis');

const {
  getGuildGlobals,
  getGuildSettings,
  createAnnounce,
} = require('../utils');

module.exports = {
  name: 'nightcore',
  description: 'Changes nightcore setting.',
  usage:
    '.nightcore - Displays the current nightcore setting.\n.nightcore [off/on]',
  async execute(message, args) {
    const guild_id = message.guild.id;
    let guildSettings = await getGuildSettings(guild_id);

    const nightcore = guildSettings.nightcore;

    if (args.length === 0) {
      const embed = createAnnounce(
        'Nightcore Setting',
        `Sheesh, the current nightcore setting is: ${nightcore ? 'on' : 'off'}.`
      );
      message.inlineReply(embed);
    } else if (args.length === 1) {
      const newNightcore = args[0];

      if (newNightcore !== 'on' && newNightcore !== 'off') {
        const embed = createAnnounce(
          'Incorrect Usage!',
          `Incorrect usage of $nightcore.\nExample: $nightcore on/off\nWithout specifying the new nightcore setting to set it at, it'll state the current nightcore setting.`,
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      guildSettings.nightcore = newNightcore === 'on';

      const guildGlobal = getGuildGlobals(guild_id);

      redisClient.set(guild_id, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(`Error setting nightcore.\n${err}`);
          return;
        }

        logger.info(`Modified nightcore for ${guild_id} to be ${nightcore}`);
      });
      const embed = createAnnounce(
        'Nightcore Set Successfully!',
        `Sheesh, set the nightcore setting to: ${newNightcore}.`
      );
      message.inlineReply(embed);
    } else {
      const embed = createAnnounce(
        'Incorrect Usage!',
        `Incorrect usage of $nightcore.\nExample: $nightcore on/off\nWithout specifying the new nightcore setting to set it at, it'll state the current nightcore setting.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
    }
  },
};
