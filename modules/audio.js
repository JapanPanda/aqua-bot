const logger = require('./logger');
const discord = require('discord.js');
const redisClient = require('./redis');
const fs = require('fs');
const globals = require('./globals');

const ytdl = require('discord-ytdl-core');
const ytsr = require('ytsr');
const ytpl = require('ytpl');

const _ = require('lodash');

const {
  getGuildSettings,
  getGuildGlobals,
  createAnnounce,
  trimDurationString,
} = require('./utils');

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
      `Started to play ${guildGlobal.queue[0].meta.title} for ${guild_id}`
    );
  });

  dispatcher.on('finish', () => {
    const guildGlobal = getGuildGlobals(guild_id);

    logger.info(
      `Finished playing ${guildGlobal.queue[0].meta.title} for ${guild_id}!`
    );
  });

  dispatcher.on('close', () => {
    logger.info('Dispatcher was closed');
    const guildGlobal = getGuildGlobals(guild_id);
    guildGlobal.queue.shift();

    if (guildGlobal.queue.length !== 0) {
      const title = guildGlobal.queue[0].meta.title;
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

            delete globals.guilds[guild_id];

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
  const { message, audio, isPredefined } = guildGlobal.queue[0];
  const { requester, title, duration } = guildGlobal.queue[0].meta;
  const guildSettings = await getGuildSettings(guild_id);

  const { nightcore, bassboost, volume } = guildSettings;

  let audioData = null;
  let audioOptions = { volume: volume, highWaterMark: 1 };

  if (audio.includes('https://www.youtube.com/')) {
    let encoder = '';

    if (nightcore) {
      if (encoder !== '') {
        encoder += ',';
      }
      encoder += 'atempo=0.95,asetrate=44100*1.40';
    }

    if (bassboost !== 0) {
      if (encoder !== '') {
        encoder += ',';
      }
      encoder += `bass=g=${bassboost}:f=110:w=0.6`;
    }

    audioData = ytdl(audio, {
      filter: 'audioonly',
      quality: 'highestaudio',
      fmt: 'mp3',
      highWaterMark: 1 << 25,
      encoderArgs: encoder === '' ? null : ['-af', encoder],
    });

    if (audioData === undefined) {
      logger.error('Invalid youtube link!');
    }
  } else if (isPredefined) {
    audioData = `./assets/${audio}`;
  }

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
    const nowPlayingEmbed = createAnnounce(
      'Now Playing',
      `[${title}](${audio}) (${duration}) [${requester}]`
    );
    message.channel.send(nowPlayingEmbed);
  }
  createDispatcher(audio, audioData, audioOptions, connection, guild_id);
};

const queuePlaylist = async (message, args, guildGlobal, isNow) => {
  try {
    const query = args.join(' ');
    const playlistId = await ytpl.getPlaylistID(query);
    const playlistResult = await ytpl(playlistId, { limit: Infinity });
    logger.info(`Queued the playlist ${playlistResult.title}`);
    const shouldPlay = guildGlobal.queue.length === 0;
    let fitAll = true;

    // calculate the duration
    let durationSeconds = playlistResult.items
      .map((ele) => ele.durationSec)
      .reduce((acc, ele) => acc + ele);

    let totalTime = new Date(durationSeconds * 1000)
      .toISOString()
      .substr(11, 8);

    totalTime = trimDurationString(totalTime);

    let queueString = playlistResult.items.reduce((acc, ele, i) => {
      if (i === 1) {
        acc = `**${i}.** [${acc.title}](${acc.shortUrl}) (${ele.duration})\n`;
      }

      const string = `**${i + 1}.** [${ele.title}](${ele.shortUrl}) (${
        ele.duration
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
      }) (${ele.duration})\n`;
    }

    if (!fitAll) {
      queueString += '...';
    }

    for (const [i, ele] of playlistResult.items.entries()) {
      const meta = {
        title: ele.title,
        duration: ele.duration,
        requester: message.author,
      };

      if (isNow) {
        guildGlobal.queue.splice(1 + i, 0, {
          message: message,
          audio: ele.shortUrl,
          meta: meta,
          isPredefined: false,
        });
      } else {
        guildGlobal.queue.push({
          message: message,
          audio: ele.shortUrl,
          meta: meta,
          isPredefined: false,
        });
      }
    }

    const queueEmbed = new discord.MessageEmbed()
      .setColor('#edca1a')
      .setTitle(`Added ${playlistResult.items.length} videos to the queue`)
      .setDescription(queueString)
      .addField('Total Time', `${totalTime}`)
      .addField('Requested by', `[${message.author}]`);

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

const queueYoutubeVideo = async (message, args, guildGlobal, isNow) => {
  // if it is not a playlist
  // TODO: maybe add the ability to choose which video when doing a query
  const guild_id = message.guild.id;
  let title = null;
  let duration = null;
  let url = null;
  if (args.length === 1 && args[0].includes('https://www.youtube.com')) {
    try {
      const info = await ytdl.getBasicInfo(args[0]);
      duration = new Date(info.videoDetails.lengthSeconds * 1000)
        .toISOString()
        .substr(11, 8);
      url = info.videoDetails.video_url;
      title = info.videoDetails.title;
    } catch (err) {
      logger.error(`Error retrieving data for ${args[0]}.`);
      // TODO maybe make it an embed reply
      message.inlineReply('Invalid youtube link!');
      return;
    }
  } else {
    const query = args.join(' ');
    const srResults = await ytsr(query, { limit: 1 });

    if (srResults.results === 0) {
      message.inlineReply('Invalid youtube link!');
      return;
    }

    const video = srResults.items[0];
    title = video.title;
    duration = video.duration;
    url = video.url;
  }

  logger.info(`Queued ${title} for ${guild_id}.`);

  let durationString = trimDurationString(duration);

  const queueEmbed = new discord.MessageEmbed()
    .setColor('#edca1a')
    .setTitle('Added to Queue')
    .setDescription(
      `[${title}](${url}) (${durationString}) [${message.author}]`
    );

  message.inlineReply(queueEmbed);

  const meta = {
    title: title,
    duration: durationString,
    requester: message.author,
  };
  if (isNow) {
    // add to guild's queue
    guildGlobal.queue.splice(1, 0, {
      message: message,
      audio: url,
      meta: meta,
      isPredefined: false,
    });
  } else {
    // add to guild's queue
    guildGlobal.queue.push({
      message: message,
      audio: url,
      meta: meta,
      isPredefined: false,
    });
  }

  // if there is nothing in the queue besides itself, go ahead and play it
  if (guildGlobal.queue.length === 1) {
    playAudio(message.guild.id);
  }
};

const queueAudio = async (message, args, isPredefined, isNow) => {
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
    queuePlaylist(message, args, guildGlobal, isNow);
    return;
  } else if (!isPredefined) {
    queueYoutubeVideo(message, args, guildGlobal, isNow);
    return;
  }

  let title = args[0];
  logger.info(`Queued ${title} for ${guild_id}.`);
  const meta = {
    title: title,
    duration: 'N/A',
    requester: message.author,
  };

  if (isNow) {
    guildGlobal.queue.splice(1, 0, {
      message: message,
      audio: args[0],
      meta: meta,
      isPredefined: isPredefined,
    });
  } else {
    // add to guild's queue
    guildGlobal.queue.push({
      message: message,
      audio: args[0],
      meta: meta,
      isPredefined: isPredefined,
    });
  }
  // if there is nothing in the queue besides itself, go ahead and play it
  if (guildGlobal.queue.length === 1) {
    playAudio(message.guild.id);
  }
};

module.exports = { queueAudio };
