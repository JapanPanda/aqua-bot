const fs = require('fs');
const Discord = require('discord.js');

require('./modules/extend-message');

const client = new Discord.Client({ partials: ['MESSAGE', 'REACTION'] });

const logger = require('./modules/logger');

const dotenv = require('dotenv');
dotenv.config();

require('./modules/redis');

const { getGuildGlobals, reactionHandler } = require('./modules/utils');

const prefix = '$';

client.commands = new Discord.Collection();

const commandFiles = fs
  .readdirSync('./modules/commands')
  .filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./modules/commands/${file}`);
  client.commands.set(command.name, command);
}

client.once('ready', () => {
  logger.info('Sheeeesh! The bot is now online!');
});

client.on('message', (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (!client.commands.has(command)) return;

  try {
    client.commands.get(command).execute(message, args);
  } catch (error) {
    logger.error(error);
    message.reply(
      'Sheeesh, an error was encountered while trying to execute that command!'
    );
  }
});

client.on('voiceStateUpdate', (oldState, newState) => {
  if (oldState.channel === null) {
    return;
  }

  if (
    oldState.channel.members.array().length === 1 &&
    oldState.channel.members.has(client.user.id)
  ) {
    const guildGlobal = getGuildGlobals(oldState.guild.id);
    if (guildGlobal.connection !== null) {
      guildGlobal.connection.disconnect();
    }
    guildGlobal.connection = null;
    guildGlobal.dispatcher = null;
    guildGlobal.queue = [];
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  // bot's reaction
  if (reaction.me) {
    return;
  }
  // attempt to retrieve message from cache
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (err) {
      logger.error(`Failed to retrieve message from cache.\n${err.stack}`);
      return;
    }
  }

  if (reaction.message.member.id !== client.user.id) {
    return;
  }

  reactionHandler(reaction, user);
});

client.login(process.env.DISCORD_TOKEN);
