const {Client} = require('discord.js');
const config = require('./config');

const client = new Client({
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
    prefix: config.prefix
});

module.exports = client;
