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
  getSpotifyTrackMeta,
  getPlaybackSettingsString,
  getSpotifyPlaylistMeta,
  convertISOToSeconds,
  isYoutubeUrl,
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

  dispatcher.on('close', async () => {
    logger.info('Dispatcher was closed');
    const guildGlobal = getGuildGlobals(guild_id);
    const guildSettings = await getGuildSettings(guild_id);
    const { shuffle, loop } = guildSettings;
    if (loop === 'off') {
      guildGlobal.queue.shift();
    } else if (loop === 'all') {
      guildGlobal.queue.push(guildGlobal.queue.shift());
    }

    if (guildGlobal.queue.length !== 0) {
      let nextIndex =
        !shuffle || loop === 'on'
          ? 0
          : Math.floor(Math.random() * guildGlobal.queue.length);

      // sometimes theres a bug when nextindex goes out of bound
      if (nextIndex >= guildGlobal.queue.length) {
        nextIndex = 0;
      }

      const title = guildGlobal.queue[nextIndex].meta.title;
      // queue next song
      logger.info(
        `Starting next song in the queue (${title}) for ${guild_id}.`
      );

      guildGlobal.queue.unshift(guildGlobal.queue.splice(nextIndex, 1)[0]);
      playAudio(guild_id);
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
  let { message, audio, isPredefined } = guildGlobal.queue[0];
  const { requester, title, duration, url } = guildGlobal.queue[0].meta;
  const guildSettings = await getGuildSettings(guild_id);

  const { nightcore, bassboost, volume } = guildSettings;

  let audioData = null;
  let audioOptions = { volume: volume, highWaterMark: 1 };

  if (audio.includes('spotify')) {
    // attempt to find the song on youtube
    const srResults = await ytsr(title, { limit: 1 });

    // rare edge case when there are no youtube videos on it
    if (!srResults.items[0]) {
      guildGlobal.queue.shift();
      message.channel.send(`Could not play this Spotify song: ${title}.`);
      playAudio(guild_id);
      return;
    }

    audio = srResults.items[0].url;
  }

  if (isYoutubeUrl(audio)) {
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

    //    if (audio.includes('&t=') || audio.includes('?t=')) {
    //      let sep = audio.includes('&t=') ? '&t=' : '?t=';
    //
    //      let timeStamp = audio.split(sep)[1].split('&')[0];
    //      audioOptions.seek = parseInt(timeStamp);
    //    }

    audioData = ytdl(audio, {
      filter: 'audioonly',
      quality: 'highestaudio',
      fmt: 'mp3',
      highWaterMark: 1 << 25,
      dlChunkSize: 0,
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

  if (!isPredefined) {
    let announceString = `[${title}](${url}) (${duration}) [${requester}]`;
    if (audioOptions.seek) {
      let timeStamp = new Date(audioOptions.seek * 1000)
        .toISOString()
        .substr(11, 8);
      announceString += ` Timestamp: ${trimDurationString(
        timeStamp
      )}\nThere may be some delay since it's seeking to a timestamp.`;
    }
    const nowPlayingEmbed = createAnnounce('Now Playing', announceString);
    const playbackSettingString = await getPlaybackSettingsString(guild_id);
    if (playbackSettingString !== '') {
      nowPlayingEmbed.setFooter(playbackSettingString);
    }
    message.channel.send(nowPlayingEmbed);
  }
  createDispatcher(audio, audioData, audioOptions, connection, guild_id);
};

const queueYoutubePlaylist = async (message, args, guildGlobal, isNow) => {
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
        url: ele.shortUrl,
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

    const guild_id = message.guild.id;
    const playbackSettingString = await getPlaybackSettingsString(guild_id);
    if (playbackSettingString !== '') {
      queueEmbed.setFooter(playbackSettingString);
    }
    message.inlineReply(queueEmbed);

    if (shouldPlay) {
      const { shuffle } = await getGuildSettings(guild_id);
      if (shuffle) {
        const randIndex = Math.floor(Math.random() * guildGlobal.queue.length);
        guildGlobal.queue.unshift(guildGlobal.queue.splice(randIndex, 1)[0]);
      }
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

  if (args.length === 1 && isYoutubeUrl(args[0])) {
    try {
      const info = await ytdl.getBasicInfo(args[0]);
      duration = new Date(info.videoDetails.lengthSeconds * 1000)
        .toISOString()
        .substr(11, 8);
      url = args[0];
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

  const playbackSettingString = await getPlaybackSettingsString(guild_id);
  if (playbackSettingString !== '') {
    queueEmbed.setFooter(playbackSettingString);
  }

  message.inlineReply(queueEmbed);

  const meta = {
    title: title,
    url: url,
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

const queuePredefined = async (message, args, guildGlobal, isNow) => {
  let title = args[0];

  const guild_id = message.guild.id;

  logger.info(`Queued ${title} for ${guild_id}.`);
  const meta = {
    title: title,
    url: null,
    duration: null,
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

const queueSpotifyTrack = async (message, args, guildGlobal, isNow) => {
  const spotifyMeta = await getSpotifyTrackMeta(args[0]);
  const url = spotifyMeta.external_urls.spotify;
  let artistString = '';
  for (const artist of spotifyMeta.artists) {
    artistString += artist.name + ', ';
  }
  artistString = artistString.substring(0, artistString.length - 2);

  let title = spotifyMeta.name + ' - ' + artistString;
  // attempt to find the song on youtube
  const srResults = await ytsr(title, { limit: 1 });

  if (!srResults.items[0]) {
    message.inlineReply("Sorry, can't play this Spotify song!");
    return;
  }

  const audioUrl = srResults.items[0].url;
  const duration = srResults.items[0].duration;

  const guild_id = message.guild.id;
  let durationString = trimDurationString(duration);

  logger.info(`Queued ${title} for ${guild_id}.`);
  const queueEmbed = new discord.MessageEmbed()
    .setColor('#edca1a')
    .setTitle('Added to Queue')
    .setDescription(
      `[${title}](${url}) (${durationString}) [${message.author}]`
    );

  const playbackSettingString = await getPlaybackSettingsString(guild_id);
  if (playbackSettingString !== '') {
    queueEmbed.setFooter(playbackSettingString);
  }

  message.inlineReply(queueEmbed);

  const meta = {
    url: url,
    title: title,
    duration: durationString,
    requester: message.author,
  };
  if (isNow) {
    // add to guild's queue
    guildGlobal.queue.splice(1, 0, {
      message: message,
      audio: audioUrl,
      meta: meta,
      isPredefined: false,
    });
  } else {
    // add to guild's queue
    guildGlobal.queue.push({
      message: message,
      audio: audioUrl,
      meta: meta,
      isPredefined: false,
    });
  }

  // if there is nothing in the queue besides itself, go ahead and play it
  if (guildGlobal.queue.length === 1) {
    playAudio(message.guild.id);
  }
};

const queueSpotifyPlaylist = async (message, args, guildGlobal, isNow) => {
  const tracks = await getSpotifyPlaylistMeta(args[0]);

  let durationSeconds = 0;
  let queueString = '';
  let shouldPlay = guildGlobal.queue.length === 0;
  for (const [i, track] of tracks.entries()) {
    const url = track.external_urls.spotify;
    let artistString = '';
    for (const artist of track.artists) {
      artistString += artist.name + ', ';
    }
    artistString = artistString.substring(0, artistString.length - 2);

    let title = track.name + ' - ' + artistString;

    const audioUrl = url;
    const duration = track.duration_ms / 1000;
    const durationString = trimDurationString(
      new Date(track.duration_ms).toISOString().substr(11, 8)
    );
    durationSeconds += duration;
    const string = `**${i + 1}.** [${title}](${url}) (${durationString})\n`;
    if ((queueString + string).length < 1021) {
      queueString += string;
    } else {
      queueString += '...';
    }

    const meta = {
      title: title,
      duration: durationString,
      url: url,
      requester: message.author,
    };

    if (isNow) {
      guildGlobal.queue.splice(1 + i, 0, {
        message: message,
        audio: audioUrl,
        meta: meta,
        isPredefined: false,
      });
    } else {
      guildGlobal.queue.push({
        message: message,
        audio: audioUrl,
        meta: meta,
        isPredefined: false,
      });
    }
  }
  const guild_id = message.guild.id;
  let totalTime = new Date(durationSeconds * 1000).toISOString().substr(11, 8);
  const queueEmbed = new discord.MessageEmbed()
    .setColor('#edca1a')
    .setTitle(`Added ${tracks.length} videos to the queue`)
    .setDescription(queueString)
    .addField('Total Time', `${totalTime}`)
    .addField('Requested by', `[${message.author}]`);

  const playbackSettingString = await getPlaybackSettingsString(guild_id);
  if (playbackSettingString !== '') {
    queueEmbed.setFooter(playbackSettingString);
  }

  message.inlineReply(queueEmbed);

  if (shouldPlay) {
    const { shuffle } = await getGuildSettings(guild_id);
    if (shuffle) {
      const randIndex = Math.floor(Math.random() * guildGlobal.queue.length);
      guildGlobal.queue.unshift(guildGlobal.queue.splice(randIndex, 1)[0]);
    }
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
  if (isPredefined) {
    queuePredefined(message, args, guildGlobal, true);
  } else if (
    isYoutubeUrl(args[0]) &&
    args[0].includes('list') &&
    ytpl.validateID(args[0])
  ) {
    queueYoutubePlaylist(message, args, guildGlobal, isNow);
  } else if (args[0].includes('open.spotify.com/track')) {
    queueSpotifyTrack(message, args, guildGlobal, isNow);
  } else if (
    args[0].includes('open.spotify.com/playlist') ||
    args[0].includes('open.spotify.com/album')
  ) {
    queueSpotifyPlaylist(message, args, guildGlobal, isNow);
  } else if (isYoutubeUrl(args[0]) || !isPredefined) {
    queueYoutubeVideo(message, args, guildGlobal, isNow);
  } else {
    message.inlineReply(
      'Invalid link/query. Currently supports Spotify and Youtube only.'
    );
  }
};

module.exports = { queueAudio };
