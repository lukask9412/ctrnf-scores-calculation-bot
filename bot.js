require('./prototypes/text_channel/alert');
const fs = require('fs');
const {ChannelType, Collection} = require('discord.js');
const config = require('./config');
const client = require('./client');

// fetch command files
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter((file) => file.endsWith('.js'));
commandFiles.forEach((file) => {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
});

// when bot is connected
client.on('ready', () => {
    console.log("Bot is connected!");
});

// when message was sent
client.on('message', (message) => {
    // do not process bot messages
    if (message.author.bot) {
        return;
    }

    const {prefix} = config;

    // allow bot messages only in the bot-spam channel
    const botSpamChannel = message.guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.bot_spam_channel);
    if (message.channel.name === botSpamChannel.name && !message.content.startsWith(prefix)) {
        message.delete();
        return;
    }

    // allow only commands to go through
    if (!message.content.startsWith(prefix)) {
        return;
    }

    // check if bot is down
    if (client.stop) {
        return message.channel.warn('Bot is down.');
    }

    // do not process if this is a results submissions message
    const resultsSubmissionsChannel = message.guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.ranked_results_submissions_channel);
    if (message.channel.name === resultsSubmissionsChannel.name && message.content.startsWith(prefix)) {
        return;
    }

    // check if user is executing commands in an allowed channel
    if (!config.channels.commands_allowed.includes(message.channel.name)) {
        message.delete().then(() => {
            message.channel.warn(`Commands can be used only in ${botSpamChannel} channel.`).then();
        });
        return;
    }

    // parse command name
    const firstRow = message.content.split('\n')[0];
    const args = firstRow.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // get command by name
    const command = client.commands.get(commandName) || client.commands.find((command) => command.aliases && command.aliases.includes(commandName));

    // if command doesn't exist, show message
    if (!command) {
        message.delete().then(() => {
            message.channel.warn(`Command '${commandName}' not found.`).then();
        });
        return;
    }

    // allow commands only in a text channels
    if (command.guildOnly && message.channel.type !== "text") {
        message.delete().then(() => {
            message.channel.warn(`Commands can be used only in ${botSpamChannel} channel.`).then();
        });
        return;
    }

    // check command arguments
    if (command.args && !args.length) {
        let reply = `Missing command arguments, ${message.author}!`;

        /// show command usage
        if (command.usage) {
            reply += `\n\nCommand usage:\n\`${prefix}${command.name} ${command.usage}\``;
        }

        message.delete().then(() => {
            message.channel.warn(reply).then();
        });
        return;
    }

    // set cooldown for the command
    const cooldowns = new Collection();
    if (!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Collection());
    }
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 1) * 1000;

    // check command cooldown
    if (cooldownAmount && timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
        if (Date.now() < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            message.delete().then(() => {
                message.channel.warn(`Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`)
            });
            return;
        }
    }

    // set author's timestamps for this command
    timestamps.set(message.author.id, Date.now());

    // delete cooldown after cooldown amount
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    // execute the command
    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.delete().then(() => {
            message.channel.error(`There was an error while executing the command!`);
        });
    }
});

// when message is updated
client.on('messageUpdate', (oldMessage, newMessage) => {
});

// when message is deleted
client.on('messageDelete', (message) => {
});

// when users presence (online status and activity) is updated
client.on('presenceUpdate', (oldPresence, newPresence) => {
});

// log in the bot
try {
    client.login(config.token).then();
} catch (e) {
    console.error(e);
    process.exit(1);
}
