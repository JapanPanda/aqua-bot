const globals = require('../globals');
const logger = require('../logger');

const redisClient = require('../redis');

const {
  getGuildGlobals,
  getGuildSettings,
  createAnnounce,
} = require('../utils');

module.exports = {
  name: 'volume',
  description: 'Changes volume',
  async execute(message, args) {
    const guild_id = message.guild.id;
    let guildSettings = getGuildSettings(guild_id);

    const volume = guildSettings.volume;

    if (args.length === 0) {
      message.inlineReply(
        `Sheesh, the current volume setting is: ${volume * 100}%.`
      );
    } else if (args.length === 1) {
      const newVolume = parseFloat(args[0]) / 100;

      if (isNaN(newVolume)) {
        const embed = createAnnounce(
          'Incorrect Usage!',
          `Incorrect usage of $volume.\nExample: $volume (50)\nWithout specifying the new volume to set it at, it'll state the current volume.`,
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      guildSettings.volume = newVolume;

      const guildGlobal = getGuildGlobals(guild_id);
      if (guildGlobal.dispatcher !== null) {
        guildGlobal.dispatcher.setVolume(guildSettings.volume);
      }

      redisClient.set(guild_id, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(`Error setting volume.\n${err}`);
          return;
        }

        logger.info(`Modified volume for ${guild_id} to be ${args[0] / 100}`);
      });
      const embed = createAnnounce(
        'Volume Set Successfully!',
        `Sheesh, set the volume setting to: ${args[0]}%.`
      );
      message.inlineReply(embed);
    } else {
      const embed = createAnnounce(
        'Incorrect Usage!',
        `Incorrect usage of $volume.\nExample: $volume (50)\nWithout specifying the new volume to set it at, it'll state the current volume.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
    }
  },
};
