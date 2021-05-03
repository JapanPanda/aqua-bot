const globals = require('./globals');

const redisClient = require('./redis');

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
    globals.guilds[guild_id] = { queue: [], dispatcher: null };
  }

  return globals.guilds[guild_id];
};

module.exports = {
  getGuildGlobals,
  getGuildSettings,
};
