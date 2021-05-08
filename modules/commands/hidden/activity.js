module.exports = {
  name: 'activity',
  description: 'Sets activity of the bot',
  ac: null,
  async execute(message, args) {
    if (message.author.id !== process.env.DEV_ID) {
      return;
    }

    this.ac.client.user.setActivity(args.slice(1).join(' '), { type: args[0] });
  },
};
