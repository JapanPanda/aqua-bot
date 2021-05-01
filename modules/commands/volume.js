const globals = require('../globals');
const logger = require('../logger');

const redisClient = require('../redis');

module.exports = {
  name: 'volume',
  description: 'Changes volume',
  async execute(message, args) {
    const guild_id = message.guild.id;
    let guildSettings = await redisClient.getAsync(guild_id);

    if (guildSettings === null) {
      guildSettings = {
        volume: 0.5,
      };
      redisClient.set(guild_id, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(err);
          return;
        }

        logger.info(`Successfully created default settings for ${guild_id}.`);
      });
    } else {
      guildSettings = JSON.parse(guildSettings);
    }

    const volume = guildSettings.volume;

    if (args.length === 0) {
      message.channel.send(
        `Sheesh, the current volume setting is: ${volume * 100}%.`
      );
    } else if (args.length === 1) {
      const newVolume = parseFloat(args[0]) / 100;
      if (isNaN(newVolume)) {
        message.channel.send(
          `Incorrect usage of $volume.\nExample: $volume (50)\nWithout specifying the new volume to set it at, it'll state the current volume.`
        );
        return;
      }

      guildSettings.volume = newVolume;

      if (
        globals.dispatchers.guild_id !== undefined &&
        globals.dispatchers.guild_id !== null
      ) {
        globals.dispatchers.guild_id.setVolume(guildSettings.volume);
      }

      redisClient.set(guild_id, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(`Error setting volume.\n${err}`);
          return;
        }

        logger.info(`Modified volume for ${guild_id} to be ${args[0] / 100}`);
      });

      message.channel.send(`Sheesh, set the volume setting to: ${args[0]}%.`);
    } else {
      message.channel.send(
        `Incorrect usage of $volume.\nExample: $volume (50)\nWithout specifying the new volume to set it at, it'll state the current volume.`
      );
    }
  },
};
