const logger = require('./logger');

const redisClient = require('./redis');

const globals = require('./globals');

// takes care of getting the guild_id volume
const playAudio = async (message, args, file) => {
  if (message.member.voice.channel) {
    const guild_id = message.guild.id;
    let guildSettings = await redisClient.getAsync(guild_id);

    if (guildSettings === null) {
      guildSettings = {
        volume: 0.5,
      };
      redisClient.set(
        guild_id,
        JSON.stringify(guildSettings, null, 1),
        (err) => {
          if (err) {
            logger.error(err);
            return;
          }

          logger.info(`Successfully created default settings for ${guild_id}.`);
        }
      );
    } else {
      guildSettings = JSON.parse(guildSettings);
    }

    const volume = guildSettings.volume;

    const connection = await message.member.voice.channel.join();

    // Create a dispatcher
    const dispatcher = connection.play(`./assets/${file}`, {
      volume: volume,
    });

    dispatcher.on('start', () => {
      globals.dispatchers.guild_id = dispatcher;
      logger.info(`Started to play ${file}`);
    });

    dispatcher.on('finish', () => {
      logger.info(`Finished playing ${file}! Starting timer to disconnect.`);
      setTimeout(
        () => {
          delete globals.dispatchers.guild_id;
          logger.info('Disconnected after 60 seconds.');
          connection.disconnect();
        },
        1000 * 60 * 5,
        [connection, globals, dispatcher]
      );
    });

    // Always remember to handle errors appropriately!
    dispatcher.on('error', (err) => {
      logger.error(err);
    });
  } else {
    message.channel.send('Sheeeesh, join a voice channel first!');
  }
};

module.exports = playAudio;
