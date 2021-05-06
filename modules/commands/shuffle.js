const globals = require('../globals');
const logger = require('../logger');

const redisClient = require('../redis');

const {
  getGuildGlobals,
  getGuildSettings,
  createAnnounce,
} = require('../utils');

module.exports = {
  name: 'shuffle',
  description: 'Changes the shuffle setting.',
  usage: '.shuffle [off/on]',
  async execute(message, args) {
    const guild_id = message.guild.id;
    let guildSettings = await getGuildSettings(guild_id);

    const shuffle = guildSettings.shuffle;

    if (args.length === 0) {
      const embed = createAnnounce(
        'Shuffle Setting',
        `Sheesh, the current shuffle setting is: ${shuffle ? 'on' : 'off'}.`
      );
      message.inlineReply(embed);
    } else if (args.length === 1) {
      const newShuffle = args[0].toLowerCase();

      if (newShuffle !== 'on' && newShuffle !== 'off') {
        const embed = createAnnounce(
          'Incorrect Usage!',
          `Incorrect usage of shuffle.\nExample: $shuffle on/off\nWithout specifying the new shuffle setting to set it at, it'll state the current shuffle setting.`,
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      guildSettings.shuffle = newShuffle === 'on';

      const guildGlobal = getGuildGlobals(guild_id);

      redisClient.set(guild_id, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(`Error setting shuffle.\n${err}`);
          return;
        }

        logger.info(`Modified shuffle for ${guild_id} to be ${newShuffle}`);
      });
      const embed = createAnnounce(
        'Shuffle Set Successfully!',
        `Sheesh, set the shuffle setting to: ${newShuffle}.`
      );
      message.inlineReply(embed);
    } else {
      const embed = createAnnounce(
        'Incorrect Usage!',
        `Incorrect usage of $shuffle.\nExample: shuffle on/off\nWithout specifying the new shuffle setting to set it at, it'll state the current shuffle setting.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
    }
  },
};
