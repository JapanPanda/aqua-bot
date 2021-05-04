const logger = require('./logger');
const discord = require('discord.js');
const redisClient = require('./redis');

const globals = require('./globals');

const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const ytpl = require('ytpl');

const _ = require('lodash');

const { getGuildSettings, getGuildGlobals } = require('./utils');

const createDispatcher = (
  audio,
  audioData,
  audioOptions,
  connection,
  guild_id
) => {
  // Create a dispatcher
  const dispatcher = connection.play(audioData, audioOptions);

  dispatcher.on('start', () => {
    const guildGlobal = getGuildGlobals(guild_id);
    guildGlobal.dispatcher = dispatcher;

    logger.info(
      `Started to play ${guildGlobal.queue[0].title} for ${guild_id}`
    );
  });

  dispatcher.on('finish', () => {
    const guildGlobal = getGuildGlobals(guild_id);

    logger.info(
      `Finished playing ${guildGlobal.queue[0].title} for ${guild_id}!`
    );
  });

  dispatcher.on('close', () => {
    logger.info('Dispatcher was closed');
    const guildGlobal = getGuildGlobals(guild_id);
    const title = guildGlobal.queue[0].title;
    guildGlobal.queue.shift();

    if (guildGlobal.queue.length !== 0) {
      // queue next song
      logger.info(
        `Starting next song in the queue (${title}) for ${guild_id}.`
      );

      const nextAudio = guildGlobal.queue[0];
      playAudio(nextAudio.message.guild.id);
    } else {
      // set timeout to disconnect.
      logger.info(
        `Queue finished, disconnecting from ${guild_id} in 30 seconds.`
      );
      setTimeout(
        () => {
          const guildGlobal = getGuildGlobals(guild_id);
          if (_.isEqual(guildGlobal.dispatcher, dispatcher)) {
            if (guildGlobal.connection !== null) {
              guildGlobal.connection.disconnect();
            }
            delete guildGlobal;
            logger.info('Disconnected after 30 seconds.');
          }
        },
        1000 * 30,
        [guild_id, dispatcher]
      );
    }
  });

  dispatcher.on('error', (err) => {
    logger.error(err);
  });
};

const playAudio = async (guild_id) => {
  const guildGlobal = getGuildGlobals(guild_id);
  const { message, audio, isPredefined, title } = guildGlobal.queue[0];

  let audioData = null;
  let audioOptions = {};

  if (audio.includes('https://www.youtube.com/')) {
    audioData = ytdl(audio, {
      quality: 'highestaudio',
      highWaterMark: 1 << 25,
      filter: 'audioonly',
    });
    audioOptions = {};
    if (audioData === undefined) {
      logger.error('Invalid youtube link!');
    }
  } else if (isPredefined) {
    audioData = `./assets/${audio}`;
  }

  const guildSettings = getGuildSettings(guild_id);

  const volume = guildSettings.volume;

  if (guildGlobal.connection === null) {
    if (message.member.voice.channel === null) {
      message.inlineReply("You're not in a voice channel anymore. >:c");
      return;
    }
    guildGlobal.connection = await message.member.voice.channel.join();
  }

  const connection = guildGlobal.connection;

  audioOptions[volume] = volume;

  if (!isPredefined) {
    const nowPlayingEmbed = new discord.MessageEmbed()
      .setColor('#edca1a')
      .setTitle('Now Playing')
      .setDescription(`[${title}](${audio})`);

    message.channel.send(nowPlayingEmbed);
  }
  createDispatcher(audio, audioData, audioOptions, connection, guild_id);
};

const queuePlaylist = async (message, args, guildGlobal) => {
  try {
    const query = args.join(' ');
    const playlistId = await ytpl.getPlaylistID(query);
    const playlistResult = await ytpl(playlistId, { limit: Infinity });
    logger.info(`Queued the playlist ${playlistResult.title}`);
    const shouldPlay = guildGlobal.queue.length === 0;
    let fitAll = true;
    let queueString = playlistResult.items.reduce((acc, ele, i) => {
      if (i === 1) {
        acc = `**${guildGlobal.queue.length + i}.** [${acc.title}](${
          acc.shortUrl
        })\n`;
      }

      const string = `**${guildGlobal.queue.length + i + 1}.** [${ele.title}](${
        ele.shortUrl
      })\n`;

      if (acc.length + string.length > 1021) {
        fitAll = false;
        return acc;
      }

      return acc + string;
    });

    if (playlistResult.items.length === 1) {
      queueString = `**${guildGlobal.queue.length + i}.** [${ele.title}](${
        ele.shortUrl
      })\n`;
    }

    if (!fitAll) {
      queueString += '...';
    }

    for (const ele of playlistResult.items) {
      guildGlobal.queue.push({
        message: message,
        audio: ele.shortUrl,
        title: ele.title,
        isPredefined: false,
      });
    }

    const queueEmbed = new discord.MessageEmbed()
      .setColor('#edca1a')
      .setTitle(`Added ${playlistResult.items.length} videos to the queue`)
      .setDescription(queueString);

    message.inlineReply(queueEmbed);

    if (shouldPlay) {
      playAudio(message.guild.id);
    }
  } catch (err) {
    logger.error(
      `Error while trying to parse youtube playlist link.\n${err.stack}`
    );
    message.inlineReply('Invalid youtube playlist link!');
    return;
  }
};

const queueYoutubeVideo = async (message, args, guildGlobal) => {
  // if it is not a playlist
  // TODO: maybe add the ability to choose which video when doing a query
  const query = args.join(' ');
  const srResults = await ytsr(query, { limit: 1 });
  if (srResults.results === 0) {
    message.inlineReply('Invalid youtube link!');
    return;
  }

  const video = srResults.items[0];
  title = video.title;
  if (
    args.length === 1 &&
    args[0].includes('https://www.youtube.com') &&
    video.url !== args[0]
  ) {
    message.inlineReply('Invalid youtube link!');
    return;
  }

  logger.info(`Queued ${title} for ${guild_id}.`);

  const queueEmbed = new discord.MessageEmbed()
    .setColor('#edca1a')
    .setTitle('Added to Queue')
    .setDescription(`[${title}](${video.url})`);

  message.inlineReply(queueEmbed);

  // add to guild's queue
  guildGlobal.queue.push({
    message: message,
    audio: video.url,
    title: title,
    isPredefined: false,
  });

  // if there is nothing in the queue besides itself, go ahead and play it
  if (guildGlobal.queue.length === 1) {
    playAudio(message.guild.id);
  }
};

const queueAudio = async (message, args, isPredefined) => {
  // user isn't in a voice channel
  if (!message.member.voice.channel) {
    message.inlineReply('Sheeeesh, get in a voice channel first!');
    return;
  }

  const guild_id = message.guild.id;

  const guildGlobal = getGuildGlobals(guild_id);

  // bot is in use already
  if (
    guildGlobal.connection !== null &&
    message.member.voice.channelID !== guildGlobal.connection.channel.id
  ) {
    message.inlineReply(
      'The bot is already in use in a different voice channel on this server!'
    );
    return;
  }

  const query = args.join(' ');
  // check to see if it is a playlist
  if (ytpl.validateID(query)) {
    queuePlaylist(message, args, guildGlobal);
    return;
  } else if (!isPredefined) {
    queueYoutubeVideo(message, args, guildGlobal);
    return;
  }

  let title = args[0];
  logger.info(`Queued ${title} for ${guild_id}.`);
  // add to guild's queue
  guildGlobal.queue.push({
    message: message,
    audio: args[0],
    title: title,
    isPredefined: isPredefined,
  });

  // if there is nothing in the queue besides itself, go ahead and play it
  if (guildGlobal.queue.length === 1) {
    playAudio(message.guild.id);
  }
};

module.exports = { queueAudio };
