module.exports = {
  name: 'play',
  description:
    'Plays Youtube/Spotify tracks and playlists. Supports searching.',
  usage:
    'play https://www.youtube.com/watch?v=fE2h3lGlOsk - Plays the Youtube link in the channel (also works on Youtube playlists and Spotify playlists/tracks.\nplay wannabe itzy - Searches Youtube for "wannabe itzy" and queues the song.',
  ac: null, // active AquaClient
  async execute(message, args) {
    const guild = this.ac.getGuildObject(message.guild.id);
    const voiceID = message.member.voice.id;
    if (!voiceID) {
      return;
    }

    guild.audioPlayer.queueAudio(args, message);
  },
};
