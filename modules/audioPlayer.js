const logger = require('./logger');
const { MessageEmbed } = require('discord.js-light');
const {
  trimDurationString,
  convertSecondsToISO,
  createAnnounceEmbed,
  getPlaylistQueryEmbed,
  getPlaybackSettingsString,
  getSongString,
  getSpotifyPlaylistQueryEmbed,
  parseSpotifyLink,
} = require('./utils');
const ytdl = require('discord-ytdl-core');
const ytsr = require('ytsr');
const ytpl = require('ytpl');
const { getData } = require('spotify-url-info');

class AudioPlayer {
  queue;
  currentSong;
  voiceConnection;
  dispatcher;
  ac;
  guildID;
  timeout;
  shouldRestart;
  lastMessage;
  lastNonPredefinedSong;

  constructor(ac, guildID) {
    this.queue = [];
    this.ac = ac;
    this.guildID = guildID;
    this.currentSong = null;
    this.shouldRestart = false;
  }

  async join(voiceChannel) {
    this.voiceConnection = await voiceChannel.join();
  }

  leave() {
    if (this.voiceConnection) {
      this.queue = [];
      this.currentSong = null;
      this.lastNonPredefinedSong = null;
      this.voiceConnection.dispatcher.destroy();
      this.voiceConnection.disconnect();
      this.voiceConnection = null;
    }
  }

  setVolume(volume) {
    if (this.voiceConnection && this.voiceConnection.dispatcher) {
      this.voiceConnection.dispatcher.setVolume(volume);
    }
  }

  pause() {
    if (this.voiceConnection) {
      this.voiceConnection.dispatcher.pause();
    }
  }

  resume() {
    if (this.voiceConnection) {
      this.voiceConnection.dispatcher.resume();
      this.voiceConnection.dispatcher.pause();
      this.voiceConnection.dispatcher.resume();
    }
  }

  skip(skipIndex) {
    skipIndex = skipIndex - 1;
    this.queue.splice(0, skipIndex);
    this.voiceConnection.dispatcher.destroy();
  }

  async restart() {
    if (this.voiceConnection) {
      this.shouldRestart = true;
      await this.voiceConnection.dispatcher.destroy();
    }
  }

  isYoutubeURL(link) {
    return link.includes('youtube.com') || link.includes('youtu.be');
  }

  createDispatcher(audioData, audioOptions) {
    const dispatcher = this.voiceConnection.play(audioData, audioOptions);

    // initialize the events
    dispatcher.on('start', () => {
      if (this.currentSong && !this.currentSong.isPredefined) {
        this.lastNonPredefinedSong = this.currentSong;
      }
      logger.info(
        `Started to play ${this.currentSong.meta.title} for ${this.guildID}`
      );
      clearTimeout(this.timeout);
    });

    dispatcher.on('finish', () => {
      logger.info(
        `Finished playing ${this.currentSong.meta.title} for ${this.guildID}`
      );
    });

    dispatcher.on('close', async () => {
      const { autoplay } = await this.ac.getGuildSettings(this.guildID);

      if (!this.shouldRestart && this.queue.length === 0) {
        if (autoplay && this.lastNonPredefinedSong && this.voiceConnection) {
          this.getSongFromAutoplay();
        } else {
          this.currentSong = null;
          logger.info(
            `No more songs left in the queue for ${this.guildID}. Starting timer to disconnect.`
          );

          this.timeout = setTimeout(() => {
            logger.info(`Disconnected from ${this.guildID} due to timer.`);
            this.leave();
          }, 1000 * 30);
        }
      } else {
        this.playNextAudio();
      }
    });
  }

  async getSongFromAutoplay() {
    const url = this.lastNonPredefinedSong.audioPath;
    const results = (await ytdl.getBasicInfo(url)).related_videos.filter(
      (ele) => !ele.isLive
    );
    if (results.length === 0) {
      logger.info(`Couldn't find any songs left.'`);
      const embed = createAnnounceEmbed(
        'Autoplay Error',
        "Couldn't find any songs to autoplay!",
        '#ffbaba'
      );
      this.lastMessage.channel.send(embed);
      this.leave();
      return;
    }
    const nextSong = results[0];
    const duration = trimDurationString(
      convertSecondsToISO(nextSong.length_seconds)
    );

    const title = nextSong.title;
    const nextSongUrl = `https://www.youtube.com/watch?v=${nextSong.id}`;
    const meta = {
      duration,
      title,
      url: nextSongUrl,
      requester: `${this.ac.client.user}`,
    };
    const song = { audioPath: nextSongUrl, meta, isPredefined: false };

    this.queue.push(song);
    this.playNextAudio();
  }

  async playNextAudio() {
    const {
      volume,
      loop,
      shuffle,
      nightcore,
      bassboost,
      treble,
      rotate,
    } = await this.ac.getGuildSettings(this.guildID);

    if (!this.shouldRestart) {
      if (loop === 'all' && this.currentSong) {
        this.queue.push(this.currentSong);
      }

      if (!shuffle && loop !== 'on') {
        this.currentSong = this.queue.shift();
      } else if (shuffle && loop !== 'on') {
        // shuffle is on
        const index = Math.floor(Math.random() * this.queue.length);
        this.currentSong = this.queue.splice(index, 1)[0];
      } else if (loop === 'on' && !this.currentSong) {
        this.currentSong = this.queue.shift();
      }
    } else {
      this.shouldRestart = false;
    }

    let audioData = null;
    let audioOptions = { volume, highWaterMark: 1 };
    if (this.currentSong.isPredefined) {
      audioData = `./assets/${this.currentSong.audioPath}`;
    } else {
      let audioPath = this.currentSong.audioPath;
      // convert spotify to youtube link
      if (this.currentSong.audioPath.includes('spotify')) {
        const srResult = await ytsr(this.currentSong.meta.title, { limit: 1 });
        if (srResult.items.length === 0) {
          // song not available, must skip
          playNextAudio();
          return;
        }
        audioPath = srResult.items[0].url;
      }

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
        encoder += `lowshelf=g=${bassboost}:f=150:w=0.8`;
      }

      if (treble !== 0) {
        if (encoder !== '') {
          encoder += ',';
        }
        encoder += `highshelf=g=${treble}:f=14000:w=1.2`;
      }

      if (rotate !== 0) {
        if (encoder !== '') {
          encoder += ',';
        }
        encoder += `apulsator=hz=${1 / rotate}`;
      }

      // alternative to bass and treble
      //      if (bassboost !== 0 || treble !== 0) {
      //        if (encoder !== '') {
      //          encoder += ',';
      //        }
      //        encoder = `firequalizer=gain_entry='entry(0,${bassboost});entry(250,${
      //          bassboost / 2
      //        });entry(1000,0);entry(4000,${treble / 2});entry(16000,${treble})'`;
      //      }

      audioData = ytdl(audioPath, {
        filter: 'audioonly',
        quality: 'highestaudio',
        fmt: 'mp3',
        highWaterMark: 6.4e7,
        dlChunkSize: 0,
        encoderArgs: encoder === '' ? null : ['-af', encoder],
      });

      const playingEmbed = createAnnounceEmbed(
        'Now Playing',
        `${getSongString(this.currentSong)}`,
        '#B2FFFF'
      );

      const playbackSettings = await this.ac.getGuildSettings(this.guildID);
      const psString = getPlaybackSettingsString(playbackSettings);
      if (psString != '') {
        playingEmbed.setFooter(psString);
      }
      this.lastMessage.channel.send(playingEmbed);
    }

    this.createDispatcher(audioData, audioOptions);
  }

  async searchAndQueueYoutubeVideo(args, message, isNow) {
    const query = args.join(' ');
    const srResults = await ytsr(query, { limit: 1 });

    if (srResults.items.length === 0) {
      message.inlineReply("Could'nt find a video for that search query!");
      return;
    }

    const video = srResults.items[0];

    const { title, url, duration } = video;

    const meta = {
      title,
      duration,
      url,
      requester: message.author.toString(),
    };

    const song = {
      audioPath: url,
      isPredefined: false,
      meta,
    };

    if (isNow) {
      this.queue.unshift(song);
    } else {
      this.queue.push(song);
    }
    logger.info(`Queued ${title} for ${this.guildID}.`);
    let queueEmbed = createAnnounceEmbed('Queued', `${getSongString(song)}`);

    const playbackSettings = await this.ac.getGuildSettings(this.guildID);
    const psString = getPlaybackSettingsString(playbackSettings);
    if (psString != '') {
      queueEmbed.setFooter(psString);
    }
    message.inlineReply(queueEmbed);
    if (!this.currentSong && this.queue.length === 1) {
      this.playNextAudio();
    }
  }

  async queueYoutubeVideo(audioUrl, message, isNow) {
    try {
      const metaData = await ytdl.getBasicInfo(audioUrl);
      const duration = new Date(metaData.videoDetails.lengthSeconds * 1000)
        .toISOString()
        .substr(11, 8);
      const title = metaData.videoDetails.title;

      const meta = {
        duration: duration,
        title: title,
        url: audioUrl,
        requester: message.author.toString(),
      };

      const song = {
        audioPath: audioUrl,
        isPredefined: false,
        meta,
      };

      if (isNow) {
        this.queue.unshift(song);
      } else {
        this.queue.push(song);
      }

      logger.info(`Queued ${title} for ${this.guildID}.`);

      const queueEmbed = createAnnounceEmbed(
        'Queued',
        `${getSongString(song)}`
      );
      const playbackSettings = await this.ac.getGuildSettings(this.guildID);
      const psString = getPlaybackSettingsString(playbackSettings);
      if (psString != '') {
        queueEmbed.setFooter(psString);
      }
      message.inlineReply(queueEmbed);
      if (this.currentSong === null && this.queue.length === 1) {
        this.playNextAudio();
      }
    } catch (err) {
      logger.info(`Invalid Youtube link was given: ${audioUrl}.\n${err.stack}`);
      message.inlineReply(
        'Invalid Youtube link! You can try searching for it with the play command!'
      );
      return;
    }
  }

  async queueYoutubePlaylist(audioUrl, message, isNow) {
    const playlistID = await ytpl.getPlaylistID(audioUrl);
    const playlistResult = await ytpl(playlistID, { limit: Infinity });
    logger.info(`Queued the playlist ${playlistResult.title}`);
    const shouldPlay = this.queue.length === 0 && !this.currentSong;

    for (const [i, ele] of playlistResult.items.entries()) {
      const meta = {
        title: ele.title,
        duration: ele.duration,
        url: ele.shortUrl,
        requester: message.author.toString(),
      };

      const newSong = {
        audioPath: ele.shortUrl,
        meta,
        isPredefined: false,
      };
      if (isNow) {
        this.queue.splice(i, 0, newSong);
      } else {
        this.queue.push(newSong);
      }
    }

    const queueEmbed = getPlaylistQueryEmbed(
      playlistResult,
      1,
      message.author.toString()
    );

    const playbackSettings = await this.ac.getGuildSettings(this.guildID);
    const psString = getPlaybackSettingsString(playbackSettings);
    if (psString != '') {
      queueEmbed.setFooter(psString);
    }
    message.inlineReply(queueEmbed).then(async (sentMessage) => {
      await sentMessage.react('⬅️');
      await sentMessage.react('➡️');
    });

    if (shouldPlay) {
      this.playNextAudio();
    }
  }

  async queueSpotifyPlaylist(audioUrl, message, isNow) {
    let playlist = await parseSpotifyLink(audioUrl);
    let tracks = playlist.tracks;
    let shouldPlay = this.queue.length === 0 && !this.currentSong;
    for (const [i, track] of tracks.entries()) {
      const url = track.external_urls.spotify;
      let artistString = '';
      for (const artist of track.artists) {
        artistString += artist.name + ', ';
      }
      artistString = artistString.substring(0, artistString.length - 2);

      let title = track.name + ' - ' + artistString;

      const durationString = trimDurationString(
        new Date(track.duration_ms).toISOString().substr(11, 8)
      );

      const meta = {
        title: title,
        duration: durationString,
        url: url,
        requester: message.author,
      };

      const song = {
        audioPath: url,
        isPredefined: false,
        meta,
      };

      if (isNow) {
        this.queue.splice(i, 0, song);
      } else {
        this.queue.push(song);
      }
    }

    const queueEmbed = getSpotifyPlaylistQueryEmbed(
      playlist,
      1,
      message.author.toString()
    );

    const playbackSettings = await this.ac.getGuildSettings(this.guildID);
    const psString = getPlaybackSettingsString(playbackSettings);
    if (psString != '') {
      queueEmbed.setFooter(psString);
    }
    message.inlineReply(queueEmbed).then(async (sentMessage) => {
      await sentMessage.react('⬅️');
      await sentMessage.react('➡️');
    });

    if (shouldPlay) {
      this.playNextAudio();
    }
  }

  async queueSpotifyTrack(audioUrl, message, isNow) {
    try {
      const spotifyMeta = await getData(audioUrl);
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

      const ytUrl = srResults.items[0].url;
      const duration = srResults.items[0].duration;
      const durationString = trimDurationString(duration);

      const meta = {
        title,
        duration: durationString,
        url,
        requester: message.author.toString(),
      };

      const song = {
        audioPath: ytUrl,
        isPredefined: false,
        meta,
      };

      if (isNow) {
        this.queue.shift(song);
      } else {
        this.queue.push(song);
      }

      logger.info(`Queued Spotify Track ${title} for ${this.guildID}`);
      const queueEmbed = createAnnounceEmbed(
        'Queued',
        `${getSongString(song)}`
      );
      const playbackSettings = await this.ac.getGuildSettings(this.guildID);
      const psString = getPlaybackSettingsString(playbackSettings);
      if (psString != '') {
        queueEmbed.setFooter(psString);
      }
      message.inlineReply(queueEmbed);

      if (!this.currentSong && this.queue.length === 1) {
        this.playNextAudio();
      }
    } catch (err) {
      logger.error(
        `Something went wrong when queueing Spotify Track ${audioUrl}.\n${err.stack}`
      );
    }
  }

  queuePredefinedAudio(args, message, isNow) {
    logger.info(`Queued ${args[0]} for ${this.guildID}.`);
    const newSong = {
      audioPath: args[0],
      isPredefined: true,
      meta: {
        title: args[0],
        duration: null,
        url: null,
        requester: message.author.toString(),
      },
    };
    if (isNow) {
      this.queue.shift(newSong);
    } else {
      this.queue.push(newSong);
    }
    if (!this.currentSong && this.queue.length === 1) {
      this.playNextAudio();
    }
  }

  async queueAudio(args, message, isNow = false, isPredefined = false) {
    const voiceChannel = message.member.voice.channel;
    if (!this.voiceConnection) {
      await this.join(voiceChannel);
    } else if (this.voiceConnection.channel.id !== voiceChannel.id) {
      message.inlineReply({ content: "I'm already in another voice channel!" });
      return;
    }

    this.lastMessage = message;

    if (isPredefined) {
      this.queuePredefinedAudio(args, message, isNow);
    } else if (this.isYoutubeURL(args[0])) {
      if (ytpl.validateID(args[0])) {
        this.queueYoutubePlaylist(args[0], message, isNow);
      } else {
        this.queueYoutubeVideo(args[0], message, isNow);
      }
    } else if (args[0].includes('spotify.com')) {
      if (args[0].includes('track')) {
        this.queueSpotifyTrack(args[0], message, isNow);
      } else {
        this.queueSpotifyPlaylist(args[0], message, isNow);
      }
    } else {
      // search youtube for video
      this.searchAndQueueYoutubeVideo(args, message, isNow);
    }
  }
}

module.exports = AudioPlayer;
