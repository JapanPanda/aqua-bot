const Discord = require('discord.js-light');
require('./extendMessage');
const logger = require('./logger');
const fs = require('fs');
const AudioPlayer = require('./audioPlayer');
const {
  getPlaylistQueryEmbedFromUrl,
  getQueueEmbed,
  getPlaybackSettingsString,
  getSpotifyPlaylistQueryEmbedFromUrl,
  getHelpEmbed,
} = require('./utils');
const redisClient = require('./redis');
require('./spotify');

class AquaClient {
  activeGuilds;
  client;
  prefix;
  commands;

  constructor(prefix) {
    this.client = new Discord.Client({
      cacheGuilds: true,
      cacheChannels: true,
      cacheOverwrites: false,
      cacheRoles: false,
      cacheEmojis: false,
      cachePresences: false,
      partials: ['MESSAGE', 'REACTION'],
    });
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
    const hiddenCommands = fs.readdirSync('./modules/commands/hidden');
    this.commands = new Map();
    for (const commandFile of commandFiles) {
      const command = require(`./commands/${commandFile}`);
      command.ac = this;
      this.commands.set(command.name, command);
    }

    for (const commandFile of hiddenCommands) {
      const command = require(`./commands/hidden/${commandFile}`);
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

    this.client.on('messageReactionAdd', async (reaction, user) => {
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

      if (reaction.message.member.id !== this.client.user.id) {
        return;
      }

      this.reactionHandler(reaction, user);
    });

    this.client.on('voiceStateUpdate', (oldState, newState) => {
      if (!oldState || oldState.channel === null) {
        return;
      }

      if (
        oldState.channel.members.array().length === 1 &&
        oldState.channel.members.has(this.client.user.id)
      ) {
        const guild = this.getGuildObject(oldState.guild.id);
        guild.audioPlayer.leave();
      }
    });
  }

  async reactionHandler(reaction, user) {
    await reaction.users.remove(user.id);

    if (reaction.message.embeds.length === 1) {
      const embed = reaction.message.embeds[0];
      if (embed.title === 'Queue') {
        let page = parseInt(embed.fields[2].value.split('/')[0]);
        let maxPage = parseInt(embed.fields[2].value.split('/')[1]);
        if (reaction.emoji.name === '⬅️') {
          page = page - 1;
        } else if (reaction.emoji.name === '➡️') {
          page = page + 1;
        }

        if (page > maxPage) {
          page = 1;
        } else if (page < 1) {
          page = maxPage;
        }

        const guild = this.getGuildObject(reaction.message.guild.id);
        const playbackSettings = await this.getGuildSettings(
          reaction.message.guild.id
        );
        const queueEmbed = await getQueueEmbed(
          guild.audioPlayer,
          page,
          playbackSettings
        );
        const psString = getPlaybackSettingsString(playbackSettings);
        if (psString != '') {
          queueEmbed.setFooter(psString);
        }
        reaction.message.edit(queueEmbed);
      } else if (embed.title === 'Help Has Arrived') {
        let page = parseInt(embed.fields[0].value.split('/')[0]);
        let maxPage = parseInt(embed.fields[0].value.split('/')[1]);
        if (reaction.emoji.name === '⬅️') {
          page = page - 1;
        } else if (reaction.emoji.name === '➡️') {
          page = page + 1;
        }

        if (page > maxPage) {
          page = 1;
        } else if (page < 1) {
          page = maxPage;
        }

        const helpEmbed = getHelpEmbed(page, reaction.message.guild.id);
        reaction.message.edit(helpEmbed);
      } else if (embed.title === 'Queued Playlist') {
        let page = parseInt(embed.fields[4].value.split('/')[0]);
        let maxPage = parseInt(embed.fields[4].value.split('/')[1]);
        if (reaction.emoji.name === '⬅️') {
          page = page - 1;
        } else if (reaction.emoji.name === '➡️') {
          page = page + 1;
        }

        if (page > maxPage) {
          page = 1;
        } else if (page < 1) {
          page = maxPage;
        }
        let split = embed.fields[0].value.split('(');
        let playlistUrl = split[split.length - 1].split(')')[0];
        let requester = embed.fields[3].value.split('[')[1].split(']')[0];

        let queueEmbed = null;
        if (playlistUrl.includes('spotify')) {
          queueEmbed = await getSpotifyPlaylistQueryEmbedFromUrl(
            playlistUrl,
            page,
            requester
          );
        } else {
          queueEmbed = await getPlaylistQueryEmbedFromUrl(
            playlistUrl,
            page,
            requester
          );
        }
        const playbackSettings = await this.getGuildSettings(
          reaction.message.guild.id
        );
        const psString = getPlaybackSettingsString(playbackSettings);
        if (psString != '') {
          queueEmbed.setFooter(psString);
        }
        reaction.message.edit(queueEmbed);
      }
    }
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

  async getGuildSettings(guildID) {
    let guildSettings = await redisClient.getAsync(guildID);
    const validationSetting = {
      volume: 0.5,
      bassboost: 0,
      treble: 0,
      nightcore: false,
      loop: 'off',
      shuffle: false,
      autoplay: false,
      rotate: 0,
      verbose: false,
    };

    if (guildSettings === null) {
      guildSettings = validationSetting;
      redisClient.set(guildID, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(err);
          return;
        }

        logger.info(`Successfully created default settings for ${guildID}.`);
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
  }
}

module.exports = AquaClient;
