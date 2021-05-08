module.exports = {
  name: 'woosh',
  description: 'Plays woosh in the voice channel.',
  ac: null, // active AquaClient
  async execute(message, args) {
    const guild = this.ac.getGuildObject(message.guild.id);
    const voiceID = message.member.voice.id;
    if (!voiceID) {
      return;
    }

    guild.audioPlayer.queueAudio(['woosh.mp3'], message, false, true);
  },
};
