module.exports = {
  name: 'yoo',
  description: 'Plays yoo in the voice channel.',
  ac: null, // active AquaClient
  async execute(message, args) {
    const guild = this.ac.getGuildObject(message.guild.id);
    const voiceID = message.member.voice.id;
    if (!voiceID) {
      return;
    }

    guild.audioPlayer.queueAudio(['yoo.mp3'], message, false, true);
  },
};
