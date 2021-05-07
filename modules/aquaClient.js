const Eris = require('eris');
const Discord = require('discord.js');
const logger = require('./logger');
const fs = require('fs');
const AudioPlayer = require('./audioPlayer');

class AquaClient {
  activeGuilds;
  client;
  prefix;
  commands;

  constructor(prefix) {
    this.client = new Discord.Client();
    this.prefix = prefix;
    // use object instead of map due to get overhead
    this.activeGuilds = {};
    this.loadCommands();
    this.setUpClientEvents();
  }

  loadCommands() {
    const commandFiles = fs
      .readdirSync('./modules/commands')
      .filter((file) => file.endsWith('.js'));
    this.commands = new Map();
    for (const commandFile of commandFiles) {
      const command = require(`./commands/${commandFile}`);
      command.ac = this;
      this.commands.set(command.name, command);
    }
  }

  setUpClientEvents() {
    this.client.on('ready', () => {
      logger.info(`Aqua Bot is online uwu`);
    });

    this.client.on('message', (message) => {
      if (!message.content.startsWith(this.prefix) || message.author.bot)
        return;
      const args = message.content.slice(this.prefix.length).trim().split(/ +/);
      const command = args.shift().toLowerCase();

      if (!this.commands.has(command)) {
        return;
      }

      try {
        this.commands.get(command).execute(message, args);
      } catch (err) {
        logger.error(
          `Error while executing command ${message.content}.\n${err.stack}`
        );
      }
    });
  }

  start() {
    this.client.login(process.env.DISCORD_TOKEN);
  }

  getGuildObject(guildID) {
    if (!(guildID in this.activeGuilds)) {
      this.activeGuilds[guildID] = {
        audioPlayer: new AudioPlayer(this, guildID),
      };
    }

    return this.activeGuilds[guildID];
  }

  inlineReply(message, messageID, channelID) {
    message.messageReference = {
      messageID: messageID,
    };
    message.allowedMentions = {
      repliedUser: true,
    };
    this.client.createMessage(channelID, message);
  }
}

module.exports = AquaClient;
