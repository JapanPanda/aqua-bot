const globals = require('../globals');
const logger = require('../logger');

const redisClient = require('../redis');

const {
  getGuildGlobals,
  getGuildSettings,
  createAnnounce,
} = require('../utils');

module.exports = {
  name: 'loop',
  description: 'Changes loop setting.',
  async execute(message, args) {
    const guild_id = message.guild.id;
    let guildSettings = await getGuildSettings(guild_id);

    const loop = guildSettings.loop;

    if (args.length === 0) {
      const embed = createAnnounce(
        'Loop Setting',
        `Sheesh, the current loop setting is: ${loop}.`
      );
      message.inlineReply(embed);
    } else if (args.length === 1) {
      const newLoop = args[0].toLowerCase();

      if (newLoop !== 'on' && newLoop !== 'off' && newLoop != 'all') {
        const embed = createAnnounce(
          'Incorrect Usage!',
          `Incorrect usage of loop.\nExample: $loop off/on/all\nWithout specifying the new loop setting to set it at, it'll state the current loop setting.`,
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      guildSettings.loop = newLoop;

      const guildGlobal = getGuildGlobals(guild_id);

      redisClient.set(guild_id, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(`Error setting loop.\n${err}`);
          return;
        }

        logger.info(`Modified loop for ${guild_id}to be ${newLoop}`);
      });
      const embed = createAnnounce(
        'Loop Set Successfully!',
        `Sheesh, set the loop setting to: ${newLoop}.`
      );
      message.inlineReply(embed);
    } else {
      const embed = createAnnounce(
        'Incorrect Usage!',
        `Incorrect usage of $loop.\nExample: loop off/on/all\nWithout specifying the new loop setting to set it at, it'll state the current loop setting.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
    }
  },
};
