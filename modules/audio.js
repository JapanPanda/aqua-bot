const logger = require('./logger');

const redisClient = require('./redis');

const globals = require('./globals');

const ytdl = require('ytdl-core-discord');

const _ = require('lodash');

const { getGuildSettings, getGuildGlobals } = require('./utils');

const playAudio = async (message, args, isPredefined) => {
  let audioData = null;
  let audioOptions = {};

  const audio = args.join(' ');

  if (audio.includes('https://www.youtube.com/')) {
    audioData = await ytdl(audio);
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
    const guildGlobal = getGuildGlobals(guild_id);
    guildGlobal.dispatcher = dispatcher;
    logger.info(`Started to play ${audio} for ${guild_id}`);
  });

  dispatcher.on('finish', () => {
    const guildGlobal = getGuildGlobals(guild_id);
    logger.info(`Finished playing ${audio} for ${guild_id}!`);
    guildGlobal.queue.shift();
    if (guildGlobal.queues.length !== 0) {
      // queue next song
      logger.info(
        `Starting next song in the queue (${audio}) for ${guild_id}.`
      );

      const nextAudio = guildGlobal.queues[0];
      console.log(nextAudio.message);
      playAudio(nextAudio.message, nextAudio.audio, nextAudio.isPredefined);
    } else {
      // set timeout to disconnect.
      logger.info(
        `Queue finished, disconnecting from ${guild_id} in 30 seconds.`
      );
      setTimeout(
        () => {
          const guildGlobal = getGuildGlobals(guild_id);
          if (_.isEqual(guildGlobal.dispatcher, dispatcher)) {
            delete guildGlobal.dispatcher;
            logger.info('Disconnected after 30 seconds.');
            connection.disconnect();
          }
        },
        1000 * 30,
        [connection, guild_id, dispatcher]
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

  const guildGlobal = getGuildGlobals(guild_id);

  // add to guild's queue
  guildGlobal.queue.push({
    message: message,
    audio: args,
    isPredefined: isPredefined,
  });

  // if there is nothing in the queue besides itself, go ahead and play it
  if (guildGlobal.queue.length == 1) {
    playAudio(message, args, isPredefined);
  }
};

module.exports = { queueAudio };
