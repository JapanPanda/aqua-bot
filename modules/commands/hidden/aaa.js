module.exports = {
  name: 'aaa',
  description: 'Plays aaa in the voice channel.',
  ac: null, // active AquaClient
  async execute(message, args) {
    const guild = this.ac.getGuildObject(message.guild.id);
    const voiceID = message.member.voice.id;
    if (!voiceID) {
      return;
    }

    guild.audioPlayer.queueAudio(['aaa.mp3'], message, false, true);
  },
};
