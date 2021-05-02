const logger = require('./logger');

const redisClient = require('./redis');

const globals = require('./globals');

const ytdl = require('ytdl-core-discord');

const _ = require('lodash');

const getGuildSettings = async (guild_id) => {
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

  return guildSettings;
};

const playAudio = async (message, audio, isPredefined) => {
  let audioData = null;
  let audioOptions = {};

  if (audio.includes('https://www.youtube.com/')) {
    audioData = await ytdl(audio);
    console.log(audioData);
    audioOptions = { type: 'opus' };
    if (audioData === undefined) {
      logger.error('Invalid youtube link!');
    }
  } else if (isPredefined) {
    audioData = `./assets/${audio}`;
  } else {
    // default to youtube search query
  }

  const guild_id = message.guild.id;

  const guildSettings = getGuildSettings(guild_id);

  const volume = guildSettings.volume;

  const connection = await message.member.voice.channel.join();

  audioOptions[volume] = volume;

  // Create a dispatcher
  const dispatcher = connection.play(audioData, audioOptions);

  dispatcher.on('start', () => {
    globals.dispatchers[guild_id] = dispatcher;
    logger.info(`Started to play ${audio} for ${guild_id}`);
  });

  dispatcher.on('finish', () => {
    logger.info(`Finished playing ${audio} for ${guild_id}!`);

    globals.queues[guild_id].shift();
    if (globals.queues[guild_id].length !== 0) {
      // queue next song
      logger.info(
        `Starting next song in the queue (${audio}) for ${guild_id}.`
      );
      const nextAudio = globals.queues[guild_id][0];

      playAudio(nextAudio.message, nextAudio.audio, nextAudio.isPredefined);
    } else {
      // set timeout to disconnect.
      logger.info(
        `Queue finished, disconnecting from ${guild_id} in 30 seconds.`
      );
      setTimeout(
        () => {
          if (_.isEqual(globals.dispatchers[guild_id], dispatcher)) {
            delete globals.dispatchers[guild_id];
            logger.info('Disconnected after 30 seconds.');
            connection.disconnect();
          }
        },
        1000 * 30,
        [connection, globals, dispatcher]
      );
    }
  });

  dispatcher.on('error', (err) => {
    logger.error(err);
  });
};

const queueAudio = async (message, args, isPredefined) => {
  // user isn't in a voice channel
  if (!message.member.voice.channel) {
    message.inlineReply('Sheeeesh, get in a voice channel first!');
    return;
  }

  const guild_id = message.guild.id;

  if (globals.queues[guild_id] === undefined) {
    globals.queues[guild_id] = [];
  }

  // add to guild's queue
  globals.queues[guild_id].push({
    message: message,
    audio: args[0],
    isPredefined: isPredefined,
  });

  // if there is nothing in the queue besides itself, go ahead and play it
  if (globals.queues[guild_id].length == 1) {
    playAudio(message, args[0], isPredefined);
  }
};

module.exports = { queueAudio };
