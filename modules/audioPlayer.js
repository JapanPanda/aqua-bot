const logger = require('./logger');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');

class AudioPlayer {
  queue;
  currentSong;
  voiceConnection;
  ac;
  guildID;
  timeout;

  constructor(ac, guildID) {
    this.queue = [];
    this.ac = ac;
    this.guildID = guildID;
    this.currentSong = null;
  }

  async join(voiceChannel) {
    this.voiceConnection = await voiceChannel.join();

    // initialize the events
    this.voiceConnection.on('start', () => {
      logger.info(
        `Started to play ${this.currentSong.meta.title} for ${this.guildID}`
      );
      clearTimeout(this.timeout);
    });

    this.voiceConnection.on('end', () => {
      logger.info(
        `Finished playing ${this.currentSong.meta.title} for ${this.guildID}`
      );

      // TODO add loop and shuffle settings here
      this.currentSong = null;

      if (this.queue.length === 0) {
        logger.info(
          `No more songs left in the queue for ${this.guildID}. Starting timer to disconnect.`
        );

        this.timeout = setTimeout(() => {
          this.ac.client.leaveVoiceChannel(this.voiceConnection.channelID);
          logger.info(`Disconnected from ${this.guildID} due to timer.`);
          this.voiceConnection = null;
        }, 1000 * 30);
      } else {
        this.playNextAudio();
      }
    });
  }

  leave() {
    this.ac.client.leaveVoiceChannel(this.voiceConnection.channelID);
    this.voiceConnection = null;
  }

  isYoutubeURL(link) {
    return link.includes('youtube.com') || link.includes('youtu.be');
  }

  playNextAudio() {
    this.currentSong = this.queue.shift();
    // TODO: add loop shuffle etc
    if (this.currentSong.isPredefined) {
      this.voiceConnection.play(`./assets/${this.currentSong.audioPath}`, {
        inlineVolume: true,
      });
    } else {
      const audioPath = ytdl(this.currentSong.audioPath, {
        filter: 'audioonly',
        quality: 'highestaudio',
        fmt: 'mp3',
        highWaterMark: 1 << 25,
        dlChunkSize: 0,
      });

      this.voiceConnection.play(audioPath, {
        highWaterMark: 1,
      });
    }
  }

  async searchAndQueueYoutubeVideo(args, message) {}

  async queueYoutubeVideo(audioUrl, message) {
    try {
      const metaData = await ytdl.getBasicInfo(audioUrl);
      const duration = new Date(metaData.videoDetails.lengthSeconds * 1000)
        .toISOString()
        .substr(11, 8);
      const title = metaData.videoDetails.title;

      const meta = {
        duration: duration,
        title: title,
        requester: message.author.mention,
      };

      this.queue.push({
        audioPath: audioUrl,
        isPredefined: false,
        meta,
      });
      logger.info(`Queued ${title} for ${message.guildID}.`);

      if (this.currentSong === null && this.queue.length === 1) {
        this.playNextAudio();
      }
    } catch (err) {
      logger.info(`Invalid Youtube link was given: ${audioUrl}.\n${err.stack}`);
      this.ac.inlineReply(
        { content: 'Invalid Youtube link!' },
        message.id,
        message.channel.id
      );
      return;
    }
  }

  async queueYoutubePlaylist(args, message) {}

  async queueAudio(args, message, isPredefined = false) {
    const voiceChannel = message.member.voice.channel;
    if (!this.voiceConnection) {
      await this.join(voiceChannel);
    } else if (this.voiceConnection.channelID !== voiceChannel.id) {
      this.ac.inlineReply({ content: "I'm already in another voice channel!" });
      return;
    }

    const query = args.join(' ');

    if (isPredefined) {
      logger.info(`Queued ${query} for ${this.guildID}.`);
      this.queue.push({
        audioPath: args[0],
        isPredefined,
        meta: {
          title: args[0],
          duration: null,
          requester: message.author.mention,
        },
      });
      if (this.currentSong === null && this.queue.length === 1) {
        this.playNextAudio();
      }
    } else if (this.isYoutubeURL(args[0])) {
      if (args[0].includes('list')) {
        this.queueYoutubePlaylist(args, message);
      } else {
        this.queueYoutubeVideo(args, message);
      }
    } else if (args[0].include('spotify.com')) {
    } else {
      // search youtube for video
      //
    }
  }
}

module.exports = AudioPlayer;
