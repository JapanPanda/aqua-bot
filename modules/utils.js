const { MessageEmbed } = require('discord.js-light');
const ytpl = require('ytpl');
const fs = require('fs');
const spotifyClient = require('./spotify');
const logger = require('./logger');

// Message-Related utils
const createAnnounceEmbed = (title, description, color = '#00FFFF') => {
  return new MessageEmbed()
    .setTitle(title)
    .setDescription(description)
    .setColor(color);
};

const getHelpEmbed = (page) => {
  let helpEmbed = new MessageEmbed();
  helpEmbed.setColor('#E0FFFF').setTitle('Help Has Arrived');

  const commandFiles = fs
    .readdirSync('./modules/commands')
    .filter((file) => file.endsWith('.js'));
  let helpString = '';

  const maxPages = Math.ceil(commandFiles.length / 5);

  if (page < 1) {
    page = 1;
  } else if (page > maxPages) {
    page = maxPages;
  }

  const offset = (page - 1) * 5;
  for (const commandFile of commandFiles.slice(offset, offset + 5)) {
    const requireString = `./commands/${commandFile}`;
    const command = require(requireString);
    const { name, description, dev, usage } = command;

    if (dev) {
      continue;
    }

    let string = `**.${name}** - ${description}\n`;
    if (usage) {
      string += `${usage}\n`;
    }

    helpString += string + '\n';
  }

  helpEmbed.setDescription(helpString).addField('Page', `${page}/${maxPages}`);
  return helpEmbed;
};

const trimDurationString = (duration) => {
  let durationString = duration;
  let split = durationString.split(':');
  if (split.length === 3 && split[0] == '00') {
    durationString = split.slice(1).join(':');
  }

  return durationString;
};

const convertSecondsToISO = (seconds) => {
  return new Date(seconds * 1000).toISOString().substr(11, 8);
};

const convertISOToSeconds = (isoTime) => {
  if (isoTime === null) {
    return 0;
  }
  // thanks to https://stackoverflow.com/questions/9640266/convert-hhmmss-string-to-seconds-only-in-javascript
  var p = isoTime.split(':'),
    s = 0,
    m = 1;

  while (p.length > 0) {
    s += m * parseInt(p.pop(), 10);
    m *= 60;
  }

  return s;
};

const getSpotifyID = (url) => {
  return url.split('spotify.com/')[1].split('/')[1].split('?')[0];
};

const getSpotifyAlbum = async (url) => {
  let playlistID = getSpotifyID(url);

  try {
    let playlist = (await spotifyClient.getAlbum(playlistID)).body;
    let tracks = playlist.tracks.items.filter((ele) => !ele.is_local);
    const parsedPlaylist = {
      title: playlist.name,
      url: url,
      tracks: [...tracks],
    };
    let offset = 100;
    let next = playlist.tracks.next;
    while (next) {
      playlist = (await spotifyClient.getAlbumTracks(playlistID, { offset }))
        .body;
      next = playlist.next;
      offset += 100;
      parsedPlaylist.tracks = parsedPlaylist.tracks.concat(
        playlist.items.filter((ele) => !ele.is_local)
      );
    }

    return parsedPlaylist;
  } catch (err) {
    logger.error(
      `Error while retrieving Spotify Playlist ${url}.\n${err.stack}`
    );
    return null;
  }
};

const getSpotifyPlaylist = async (url) => {
  let playlistID = getSpotifyID(url);

  try {
    let playlist = (await spotifyClient.getPlaylist(playlistID)).body;
    let tracks = playlist.tracks.items
      .filter((ele) => !ele.is_local)
      .map((ele) => ele.track);
    const parsedPlaylist = {
      title: playlist.name,
      url: url,
      tracks: [...tracks],
    };
    let offset = 100;
    let next = playlist.tracks.next;
    while (next) {
      playlist = (await spotifyClient.getPlaylistTracks(playlistID, { offset }))
        .body;
      next = playlist.next;
      offset += 100;
      parsedPlaylist.tracks = parsedPlaylist.tracks.concat(
        playlist.items.filter((ele) => !ele.is_local).map((ele) => ele.track)
      );
    }

    return parsedPlaylist;
  } catch (err) {
    logger.error(
      `Error while retrieving Spotify Playlist ${url}.\n${err.stack}`
    );
    return null;
  }
};

// used to differentiate album vs playlist
const parseSpotifyLink = async (url) => {
  if (url.includes('/playlist/')) {
    let playlist = await getSpotifyPlaylist(url);
    return playlist;
  } else if (url.includes('/album/')) {
    let playlist = await getSpotifyAlbum(url);
    return playlist;
  } else {
    logger.error(`Unrecognizable Spotify link ${url}.`);
    return null;
  }
};

const getSpotifyPlaylistQueryString = (tracks, page) => {
  const maxPages = Math.ceil(tracks.length / 5);
  if (page < 1) {
    page = maxPages;
  } else if (page > maxPages) {
    page = 1;
  }

  let offset = 5 * (page - 1);
  let queueString = tracks.slice(offset, offset + 5).reduce((acc, ele, i) => {
    if (i === 1) {
      let accISO = convertSecondsToISO(acc.duration_ms / 1000);
      acc = `**${offset + i}.** [${acc.name}](${
        acc.external_urls.spotify
      }) (${trimDurationString(accISO)})\n`;
    }

    let eleISO = convertSecondsToISO(ele.duration_ms / 1000);
    const string = `**${offset + i + 1}.** [${ele.name}](${
      ele.external_urls.spotify
    }) (${trimDurationString(eleISO)})\n`;

    return acc + string;
  });

  if (tracks.slice(offset, offset + 5).length === 1) {
    let iso = convertSecondsToISO(tracks[0].duration_ms / 1000);
    queueString = `**${offset + 1}.** [${tracks[0].name}](${
      tracks[0].external_urls.spotify
    }) (${trimDurationString(iso)})\n`;
  }

  return queueString;
};

const getSpotifyPlaylistQueryEmbed = (playlist, page, requester, url) => {
  // calculate the duration
  let durationSeconds = playlist.tracks
    .map((ele) => ele.duration_ms)
    .reduce((acc, ele) => acc + ele);

  let totalTime = convertSecondsToISO(durationSeconds);

  totalTime = trimDurationString(totalTime);

  const queueString = getSpotifyPlaylistQueryString(playlist.tracks, page);
  const maxPages = Math.ceil(playlist.tracks.length / 5);
  const queueEmbed = new MessageEmbed()
    .setColor('#00FFFF')
    .setTitle(`Queued Playlist`)
    .setDescription(queueString)
    .addFields(
      {
        name: 'Playlist',
        value: `[${playlist.title}](${playlist.url})`,
        inline: true,
      },
      { name: 'Duration', value: `${totalTime}`, inline: true },
      {
        name: 'Tracks',
        value: `${playlist.tracks.length} tracks`,
        inline: true,
      },
      {
        name: 'Requester',
        value: `[${requester}]`,
        inline: false,
      },
      { name: 'Page', value: `${page}/${maxPages}` }
    );

  return queueEmbed;
};

const getSpotifyPlaylistQueryEmbedFromUrl = async (url, page, requester) => {
  const playlist = await parseSpotifyLink(url);
  const embed = getSpotifyPlaylistQueryEmbed(playlist, page, requester, url);
  return embed;
};

const getPlaylistQueryString = (items, page) => {
  const maxPages = Math.ceil(items.length / 5);
  if (page < 1) {
    page = maxPages;
  } else if (page > maxPages) {
    page = 1;
  }
  let offset = 5 * (page - 1);
  let queueString = items.slice(offset, offset + 5).reduce((acc, ele, i) => {
    if (i === 1) {
      acc = `**${offset + i}.** [${acc.title}](${acc.shortUrl}) (${
        ele.duration
      })\n`;
    }

    const string = `**${offset + i + 1}.** [${ele.title}](${ele.shortUrl}) (${
      ele.duration
    })\n`;

    return acc + string;
  });

  if (items.slice(offset, offset + 5).length === 1) {
    queueString = `**${offset + 1}.** [${items[0].title}](${
      items[0].shortUrl
    }) (${items[0].duration})\n`;
  }

  return queueString;
};

const getPlaylistQueryEmbed = (playlist, page, requester) => {
  // calculate the duration
  let durationSeconds = playlist.items
    .map((ele) => ele.durationSec)
    .reduce((acc, ele) => acc + ele);

  let totalTime = convertSecondsToISO(durationSeconds);
  totalTime = trimDurationString(totalTime);

  const queueString = getPlaylistQueryString(playlist.items, page);
  const maxPages = Math.ceil(playlist.items.length / 5);
  const queueEmbed = new MessageEmbed()
    .setColor('#00FFFF')
    .setTitle(`Queued Playlist`)
    .setDescription(queueString)
    .addFields(
      {
        name: 'Playlist',
        value: `[${playlist.title}](${playlist.url})`,
        inline: true,
      },
      { name: 'Duration', value: `${totalTime}`, inline: true },
      {
        name: 'Tracks',
        value: `${playlist.items.length} tracks`,
        inline: true,
      },
      {
        name: 'Requester',
        value: `[${requester}]`,
        inline: false,
      },
      { name: 'Page', value: `${page}/${maxPages}` }
    );

  return queueEmbed;
};

const getPlaylistQueryEmbedFromUrl = async (playlistUrl, page, requester) => {
  const playlist = await ytpl(playlistUrl);

  return getPlaylistQueryEmbed(playlist, page, requester);
};

const getSongString = (song) => {
  if (song.isPredefined) {
    return `${song.meta.title} [${song.meta.requester}]`;
  }
  return `[${song.meta.title}](${song.meta.url}) (${song.meta.duration}) [${song.meta.requester}]`;
};

const getPlaybackSettingsString = (playbackSettings) => {
  const {
    nightcore,
    bassboost,
    autoplay,
    loop,
    shuffle,
    treble,
    rotate,
  } = playbackSettings;

  let string = '';

  if (loop === 'all') {
    string += 'Loop All, ';
  } else if (loop === 'on') {
    string += 'Loop, ';
  }

  if (shuffle) {
    string += 'Shuffle, ';
  }

  if (autoplay) {
    string += `Autoplay, `;
  }

  if (nightcore) {
    string += 'Nightcore, ';
  }

  if (bassboost !== 0) {
    string += `Bassboost ${bassboost} dB, `;
  }

  if (treble !== 0) {
    string += `Treble ${treble} dB, `;
  }

  if (rotate !== 0) {
    string += `3d ${rotate} seconds, `;
  }

  return string.substring(0, string.length - 2);
};

const getQueueEmbed = async (audioPlayer, page, playbackSettings) => {
  // empty queue
  if (!audioPlayer.currentSong && audioPlayer.queue.length === 0) {
    const queueEmbed = new MessageEmbed()
      .setColor('#edca1a')
      .setTitle('Current Queue')
      .setDescription('The queue is currently empty!');

    const playbackSettingString = getPlaybackSettingsString(playbackSettings);
    if (playbackSettingString !== '') {
      queueEmbed.setFooter(playbackSettingString);
    }
    return createAnnounceEmbed(
      'Current Queue',
      'The queue is currently empty!',
      '#3AA8C1'
    );
  }

  let currSong = audioPlayer.currentSong;
  let queue = audioPlayer.queue;

  // only want 5 songs shown in the queue
  const maxPages = Math.ceil(queue.length / 5);

  if (page > maxPages) {
    page = 1;
  } else if (page < 1) {
    page = maxPages;
  }

  const offset = (page - 1) * 5;
  const currQueue = queue.slice(offset, offset + 5);

  let queueString =
    queue.length === 0
      ? 'The queue is currently empty!'
      : currQueue.reduce((acc, ele, i) => {
          if (i === 1) {
            acc = `**${i + offset}**. ${getSongString(acc)}\n`;
          }

          return acc + `**${i + offset + 1}**. ${getSongString(ele)}\n`;
        });

  if (queue.length === 1) {
    queueString = `**1.** ${getSongString(queue[0])}\n`;
  }

  let currPlayString = getSongString(currSong);

  let durationSeconds =
    queue.length === 0
      ? 0
      : queue
          .map((ele) => convertISOToSeconds(ele.meta.duration))
          .reduce((acc, ele) => acc + ele);

  let totalTime = convertSecondsToISO(durationSeconds);
  totalTime = trimDurationString(totalTime);

  const queueEmbed = new MessageEmbed()
    .setColor('#3AA8C1')
    .setTitle('Queue')
    .addFields(
      { name: 'Currently Playing', value: currPlayString },
      {
        name: `Current Queue (${totalTime}) [${queue.length} videos]`,
        value: queueString,
      },
      { name: 'Page', value: `${page}/${maxPages}` }
    );

  const playbackSettingString = getPlaybackSettingsString(playbackSettings);
  if (playbackSettingString !== '') {
    queueEmbed.setFooter(playbackSettingString);
  }
  return queueEmbed;
};

module.exports = {
  createAnnounceEmbed,
  trimDurationString,
  convertSecondsToISO,
  getPlaylistQueryString,
  getPlaylistQueryEmbed,
  getPlaylistQueryEmbedFromUrl,
  getSongString,
  getQueueEmbed,
  getPlaybackSettingsString,
  getSpotifyPlaylistQueryEmbed,
  getSpotifyPlaylistQueryEmbedFromUrl,
  getSpotifyPlaylist,
  parseSpotifyLink,
  getHelpEmbed,
};
