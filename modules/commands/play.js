const { createAnnounceEmbed } = require('../utils');

module.exports = {
  name: 'play',
  description:
    'Plays Youtube/Spotify tracks and playlists. Supports searching.',
  usage:
    'play https://www.youtube.com/watch?v=fE2h3lGlOsk - Plays the Youtube link in the channel (also works on Youtube playlists and Spotify playlists/tracks.\nplay wannabe itzy - Searches Youtube for "wannabe itzy" and queues the song.',
  ac: null, // active AquaClient
  async execute(message, args) {
    if (args.length === 0) {
      const embed = createAnnounceEmbed(
        'Incorrect Usage',
        'Incorrect usage, $play [youtube/spotify link or search query]',
        '#ffbaba'
      );
      message.inlineReply(embed);
      return;
    }
    const guild = this.ac.getGuildObject(message.guild.id);
    const voiceID = message.member.voice.id;
    if (!voiceID) {
      return;
    }

    guild.audioPlayer.queueAudio(args, message);
  },
};
