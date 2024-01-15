const {Client, GatewayIntentBits, Partials} = require('discord.js');
const config = require('./config');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.MessageContent,

    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
    ],
    prefix: config.prefix
});

module.exports = client;
