const Eris = require('eris');
const logger = require('./logger');
const fs = require('fs');

class AquaClient {
  connectedGuilds;
  client;
  prefix;
  commands;

  constructor(prefix) {
    this.client = new Eris(process.env.DISCORD_TOKEN);
    this.prefix = prefix;
    this.loadCommands();
    this.setUpClientEvents();
  }

  loadCommands() {
    const commandFiles = fs.readdirSync('./modules/commands');
    this.commands = new Map();
    for (const commandFile of commandFiles) {
      const command = require(`./commands/${commandFile}`);
      this.commands.set(command.name, command);
    }
  }

  setUpClientEvents() {
    this.client.on('ready', () => {
      logger.info(`Aqua Bot is online uwu`);
    });

    this.client.on('messageCreate', (message) => {
      if (message.content.length === 0 || message.content[0] !== this.prefix) {
        return;
      }

      const splits = message.content.split(' ');
      const command = splits[0].slice(1).toLowerCase();
      const args = splits.slice(1);

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
    this.client.connect();
  }
}

module.exports = AquaClient;
