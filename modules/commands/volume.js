const logger = require('../logger');
const redisClient = require('../redis');
const { createAnnounceEmbed } = require('../utils');

module.exports = {
  name: 'volume',
  description: 'Changes volume',
  usage:
    '.volume - Displays the current volume.\n.volume 20 - Sets the volume to 20%.',
  ac: null,
  async execute(message, args) {
    const guildID = message.guild.id;
    let guildSettings = await this.ac.getGuildSettings(guildID);

    const volume = guildSettings.volume;
    if (args.length === 0) {
      const embed = createAnnounceEmbed(
        'Volume Setting',
        `The current volume setting is: ${volume * 100}%.`
      );
      message.inlineReply(embed);
    } else if (args.length === 1) {
      const newVolume = parseFloat(args[0]) / 100;

      if (isNaN(newVolume)) {
        const embed = createAnnounceEmbed(
          'Incorrect Usage!',
          `Incorrect usage of $volume.\nExample: $volume 50\nWithout specifying the new volume to set it at, it'll state the current volume.`,
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      guildSettings.volume = newVolume;

      const guild = this.ac.getGuildObject(guildID);
      guild.audioPlayer.setVolume(guildSettings.volume);

      redisClient.set(guildID, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(`Error setting volume.\n${err}`);
          return;
        }

        logger.info(`Modified volume for ${guildID} to be ${args[0] / 100}`);
      });

      const verbose = guildSettings.verbose;
      if (verbose) {
        const embed = createAnnounceEmbed(
          'Volume Set Successfully!',
          `Set the volume setting to: ${args[0]}%.`,
          '#E0FFFF'
        );
        message.inlineReply(embed);
      } else {
        message.react('✅');
      }
    } else {
      const embed = createAnnounce(
        'Incorrect Usage!',
        `Incorrect usage of $volume.\nExample: $volume 50\nWithout specifying the new volume to set it at, it'll state the current volume.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
    }
  },
};
