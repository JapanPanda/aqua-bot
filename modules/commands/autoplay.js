const logger = require('../logger');
const redisClient = require('../redis');
const { createAnnounceEmbed } = require('../utils');

module.exports = {
  name: 'autoplay',
  description:
    'Autoplay will automatically play related songs after your queue finishes.',
  usage: '.autoplay [off/on]',
  ac: null,
  async execute(message, args) {
    const guildID = message.guild.id;
    let guildSettings = await this.ac.getGuildSettings(guildID);

    const autoplay = guildSettings.autoplay;

    if (args.length === 0) {
      const embed = createAnnounceEmbed(
        'Autoplay Setting',
        `The current autoplay setting is: ${autoplay ? 'on' : 'off'}.`
      );
      message.inlineReply(embed);
    } else if (args.length === 1) {
      const newAutoplay = args[0].toLowerCase();

      if (newAutoplay !== 'on' && newAutoplay !== 'off') {
        const embed = createAnnounceEmbed(
          'Incorrect Usage!',
          `Incorrect usage of autoplay.\nExample: autoplay on/off\nWithout specifying the new autoplay setting to set it at, it'll state the current autoplay setting.`,
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      guildSettings.autoplay = newAutoplay === 'on';

      redisClient.set(guildID, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(`Error setting autoplay.\n${err}`);
          return;
        }

        logger.info(`Modified autoplay for ${guildID} to be ${newAutoplay}`);
      });
      const embed = createAnnounceEmbed(
        'Autoplay Set Successfully!',
        `Set the autoplay setting to: ${newAutoplay}.`,
        '#E0FFFF'
      );
      message.inlineReply(embed);
    } else {
      const embed = createAnnounceEmbed(
        'Incorrect Usage!',
        `Incorrect usage of autoplay.\nExample: autoplay on/off\nWithout specifying the new autoplay setting to set it at, it'll state the current autoplay setting.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
    }
  },
};
