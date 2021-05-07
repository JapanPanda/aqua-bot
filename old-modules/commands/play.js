const { queueAudio } = require('../audio');
const { createAnnounce } = require('../utils');

module.exports = {
  name: 'play',
  description:
    'Queues a Spotify or Youtube video/playlist in the current voice channel.',
  usage:
    '.play https://www.youtube.com/watch?v=fE2h3lGlOsk - Plays the Youtube link in the channel (also works on Youtube playlists and Spotify playlists/tracks.\n.play wannabe itzy - Searches Youtube for "wannabe itzy" and queues the song.',
  async execute(message, args) {
    if (args.length === 0) {
      const embed = createAnnounce(
        'Incorrect Usage',
        'Incorrect usage, $play [youtube link or search query]',
        '#ffbaba'
      );
      message.inlineReply(embed);
      return;
    }
    queueAudio(message, args, false);
  },
};
