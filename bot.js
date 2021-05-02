const fs = require("fs");
const Discord = require("discord.js");

require("./modules/extend-message");

const client = new Discord.Client();

const logger = require("./modules/logger");

const dotenv = require("dotenv");
dotenv.config();

require("./modules/redis");

const prefix = "$";

client.commands = new Discord.Collection();

const commandFiles = fs
  .readdirSync("./modules/commands")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./modules/commands/${file}`);
  client.commands.set(command.name, command);
}

client.once("ready", () => {
  logger.info("Sheeeesh! The bot is now online!");
});

client.on("message", (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (!client.commands.has(command)) return;

  try {
    client.commands.get(command).execute(message, args);
  } catch (error) {
    logger.error(error);
    message.reply(
      "Sheeesh, an error was encountered while trying to execute that command!"
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
