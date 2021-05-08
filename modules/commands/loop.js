const logger = require('../logger');
const redisClient = require('../redis');
const { createAnnounceEmbed } = require('../utils');

module.exports = {
  name: 'loop',
  description:
    'Changes the loop setting. Three modes, off (no looping), on (loops the current song), and all (loops the entire queue).',
  usage: '.loop [off/on/all]',
  ac: null,
  async execute(message, args) {
    const guildID = message.guild.id;
    let guildSettings = await this.ac.getGuildSettings(guildID);

    const loop = guildSettings.loop;

    if (args.length === 0) {
      const embed = createAnnounceEmbed(
        'Loop Setting',
        `The current loop setting is: ${loop}.`
      );
      message.inlineReply(embed);
    } else if (args.length === 1) {
      const newLoop = args[0].toLowerCase();

      if (newLoop !== 'on' && newLoop !== 'off' && newLoop != 'all') {
        const embed = createAnnounceEmbed(
          'Incorrect Usage!',
          `Incorrect usage of loop.\nExample: $loop off/on/all\nWithout specifying the new loop setting to set it at, it'll state the current loop setting.`,
          '#ffbaba'
        );
        message.inlineReply(embed);
        return;
      }

      guildSettings.loop = newLoop;

      redisClient.set(guildID, JSON.stringify(guildSettings), (err) => {
        if (err) {
          logger.error(`Error setting loop.\n${err}`);
          return;
        }

        logger.info(`Modified loop for ${guildID} to be ${newLoop}`);
      });
      const embed = createAnnounceEmbed(
        'Loop Set Successfully!',
        `Set the loop setting to: ${newLoop}.`,
        '#E0FFFF'
      );
      message.inlineReply(embed);
    } else {
      const embed = createAnnounceEmbed(
        'Incorrect Usage!',
        `Incorrect usage of $loop.\nExample: loop off/on/all\nWithout specifying the new loop setting to set it at, it'll state the current loop setting.`,
        '#ffbaba'
      );
      message.inlineReply(embed);
    }
  },
};
