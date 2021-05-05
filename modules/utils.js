const globals = require('./globals');
const logger = require('./logger');
const redisClient = require('./redis');

const { getData, getTracks } = require('spotify-url-info');
const discord = require('discord.js');

const createAnnounce = (title, description, color = '#edca1a') => {
  const announceEmbed = new discord.MessageEmbed()
    .setColor(color)
    .setTitle(title)
    .setDescription(description);

  return announceEmbed;
};

const getGuildSettings = async (guild_id) => {
  let guildSettings = await redisClient.getAsync(guild_id);
  const validationSetting = {
    volume: 0.5,
    bassboost: 0,
    nightcore: false,
    loop: 'off',
    shuffle: false,
  };

  if (guildSettings === null) {
    guildSettings = validationSetting;
    redisClient.set(guild_id, JSON.stringify(guildSettings), (err) => {
      if (err) {
        logger.error(err);
        return;
      }

      logger.info(`Successfully created default settings for ${guild_id}.`);
    });
  } else {
    guildSettings = JSON.parse(guildSettings);

    for (const prop in validationSetting) {
      if (!(prop in guildSettings)) {
        guildSettings[prop] = validationSetting[prop];
      }
    }
  }

  return guildSettings;
};

const getGuildGlobals = (guild_id) => {
  if (globals.guilds[guild_id] === undefined) {
    globals.guilds[guild_id] = {
      queue: [],
      dispatcher: null,
      connection: null,
    };
  }

  return globals.guilds[guild_id];
};

const trimDurationString = (duration) => {
  let durationString = duration;
  let split = durationString.split(':');
  if (split.length === 3 && split[0] == '00') {
    durationString = split.slice(1).join(':');
  }

  return durationString;
};

const getSongString = (ele) => {
  if (ele.isPredefined) {
    return `${ele.meta.title} [${ele.meta.requester}]`;
  }

  return `[${ele.meta.title}](${ele.meta.url}) (${ele.meta.duration}) [${ele.meta.requester}]`;
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

const getQueueEmbed = async (args, guild_id) => {
  // empty queue
  if (
    globals.guilds[guild_id] === undefined ||
    globals.guilds[guild_id].queue.length === 0
  ) {
    const queueEmbed = new discord.MessageEmbed()
      .setColor('#edca1a')
      .setTitle('Current Queue')
      .setDescription('The queue is currently empty!');

    const playbackSettingString = await getPlaybackSettingsString(guild_id);
    if (playbackSettingString !== '') {
      queueEmbed.setFooter(playbackSettingString);
    }
    return createAnnounce('Current Queue', 'The queue is currently empty!');
  }

  const guildGlobal = getGuildGlobals(guild_id);
  let currSong = guildGlobal.queue[0];
  let queue = [...guildGlobal.queue];

  // only want 5 songs shown in the queue
  let page =
    args.length !== 0 && parseInt(args[0]) !== NaN ? parseInt(args[0]) : 1;

  const maxPages = Math.ceil((queue.length - 1) / 5);

  if (page > maxPages) {
    page = maxPages;
  } else if (page < 1) {
    page = 1;
  }

  const offset = (page - 1) * 5;
  queue = queue.slice(0 + offset, 6 + offset);

  let queueString = queue.reduce((acc, ele, i) => {
    if (i === 1) {
      acc = '';
    }

    return acc + `**${i + offset}**. ${getSongString(ele)}\n`;
  });

  let currPlayString = getSongString(currSong);

  if (queue.length === 1 || queueString === '') {
    queueString = 'The queue is currently empty!';
  }

  let durationSeconds = guildGlobal.queue
    .map((ele) => convertISOToSeconds(ele.meta.duration))
    .reduce((acc, ele) => acc + ele);

  let totalTime = new Date(durationSeconds * 1000).toISOString().substr(11, 8);
  totalTime = trimDurationString(totalTime);

  const queueEmbed = new discord.MessageEmbed()
    .setColor('#edca1a')
    .setTitle('Queue')
    .addFields(
      { name: 'Currently Playing', value: currPlayString },
      { name: `Current Queue (${totalTime})`, value: queueString },
      { name: 'Page', value: `${page}/${maxPages}` }
    );

  const playbackSettingString = await getPlaybackSettingsString(guild_id);
  if (playbackSettingString !== '') {
    queueEmbed.setFooter(playbackSettingString);
  }

  return queueEmbed;
};

const getPlaybackSettingsString = async (guild_id) => {
  const guildSettings = await getGuildSettings(guild_id);
  const { nightcore, bassboost, loop, shuffle } = guildSettings;

  let string = '';

  if (loop === 'all') {
    string += 'Loop All, ';
  } else if (loop === 'on') {
    string += 'Loop, ';
  }

  if (shuffle) {
    string += 'Shuffle, ';
  }

  if (nightcore) {
    string += 'Nightcore, ';
  }

  if (bassboost !== 0) {
    string += `Bassboost ${bassboost} dB, `;
  }

  return string.substring(0, string.length - 2);
};

const isYoutubeUrl = (link) => {
  return link.includes('youtube.com') || link.includes('youtu.be');
};

const getSpotifyId = (link) => {
  return link.split('/track/')[1].split('?')[0];
};

const getSpotifyTrackMeta = async (link) => {
  return await getData(link);
};

const getSpotifyPlaylistMeta = async (link) => {
  return await getTracks(link);
};

const reactionHandler = async (reaction, user) => {
  await reaction.users.remove(user.id);

  if (reaction.message.embeds.length === 1) {
    const embed = reaction.message.embeds[0];
    if (embed.title === 'Queue') {
      let page = parseInt(embed.fields[2].value.split('/')[0]);
      if (reaction.emoji.name === '⬅️') {
        page = page - 1;
      } else if (reaction.emoji.name === '➡️') {
        page = page + 1;
      }

      const queueEmbed = getQueueEmbed([page], reaction.message.guild.id);
      reaction.message.edit(queueEmbed);
    }
  }
};

module.exports = {
  getGuildGlobals,
  getGuildSettings,
  getQueueEmbed,
  reactionHandler,
  createAnnounce,
  trimDurationString,
  getPlaybackSettingsString,
  getSpotifyTrackMeta,
  getSpotifyPlaylistMeta,
  convertISOToSeconds,
  isYoutubeUrl,
};
