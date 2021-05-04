const globals = require('./globals');

const redisClient = require('./redis');

const discord = require('discord.js');

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

const getQueueEmbed = (args, guild_id) => {
  // empty queue
  if (
    globals.guilds[guild_id] === undefined ||
    globals.guilds[guild_id].queue.length === 0
  ) {
    const queueEmbed = new discord.MessageEmbed()
      .setColor('#edca1a')
      .setTitle('Current Queue')
      .setDescription('The queue is currently empty!');

    return queueEmbed;
  }

  const guildGlobal = getGuildGlobals(guild_id);
  let currSong = guildGlobal.queue[0];
  let queue = [...guildGlobal.queue];

  // only want 5 songs shown in the queue
  let page =
    args.length !== 0 && parseInt(args[0]) !== NaN ? parseInt(args[0]) : 1;

  const maxPages = Math.ceil(queue.length / 5);

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

    if (ele.isPredefined) {
      return acc + `**${i + offset}**. ${ele.title}\n`;
    }

    return acc + `**${i + offset}**. [${ele.title}](${ele.audio})\n`;
  });

  let currPlayString = `[${currSong.title}](${currSong.audio})`;

  if (queue.length === 1 || queueString === '') {
    queueString = 'The queue is currently empty!';
  }

  const queueEmbed = new discord.MessageEmbed()
    .setColor('#edca1a')
    .setTitle('Queue')
    .addFields(
      { name: 'Currently Playing', value: currPlayString },
      { name: 'Current Queue', value: queueString },
      { name: 'Page', value: `${page}/${maxPages}` }
    );

  return queueEmbed;
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
};
