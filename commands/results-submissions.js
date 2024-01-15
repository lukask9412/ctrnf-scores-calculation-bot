// this is not a command,
// but it is in this directory so the file automatically autoloads

const client = require('../client');
const config = require("../config");
const {MessageAttachment} = require("discord.js");
const ScoresCalculation = require('../utils/scores_calculation/scores_calculation');
const TableParser = require('../utils/scores_calculation/table_parser');

client.on('message', async (message) => {
    processResultsSubmission(message);
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    processResultsSubmission(newMessage);
});

/**
 * Post results in the results channel when a message is created or updated in the results submissions channel
 *
 * @param {Message} message
 */
function processResultsSubmission(message) {
    // do not process bot messages
    if (message && message.author && message.author.bot) {
        return;
    }
    const mentions = message && message.author ? [message.author.id] : [];

    // get channels
    const resultsChannel = message.guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.ranked_results_channel);
    const resultsSubmissionsChannel = message.guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.ranked_results_submissions_channel);
    const notificationsChannel = message.guild.channels.cache.find((c) => c.name.toLowerCase() === config.channels.notifications_channel);

    // check if channels exist
    if (!resultsChannel || !resultsSubmissionsChannel || !notificationsChannel) {
        return;
    }

    // allow calculation only if the message was posted in the results submissions channel
    if (message.channel.name !== resultsSubmissionsChannel.name) {
        return;
    }

    // validate message content
    const table = message.content.trim().replace(/`/g, '');
    if (!table.length) {
        return;
    }

    // validate template
    const tableParser = new TableParser();
    const parsedTable = tableParser.parse(table);
    const template = tableParser.template;
    if (null === parsedTable || "" === template) {
        notificationsChannel.warn(
            ["Couldn't calculate lobby results.", "Please provide a valid table template."].join("\n"),
            mentions
        );
        return;
    }

    // Send a formatted table template in the results submissions channel and remove the old one
    message.channel.send((mentions.length ? `<@!${mentions.join(", ")}>, ` : '') + `\`\`\`${template}\`\`\``).then(() => message.delete());

    // start of the lobby results calculation
    message.channel.info('Calculating lobby results...').then(async (m) => {
        // generate results table image
        const scoresCalculation = new ScoresCalculation();
        const imageBuffer = await scoresCalculation.generateResultsTable(template);
        if (null === imageBuffer) {
            m.delete().then(() => notificationsChannel.warn(
                scoresCalculation.getErrorMessage(scoresCalculation.errorType),
                mentions
            ));
            return;
        }

        // send the generated table image
        m.delete().then(() => {
            try {
                // send message to the results channel
                const attachment = new MessageAttachment(imageBuffer, `${scoresCalculation.table.lobbyType}_${scoresCalculation.table.lobbyNumber}.png`);
                resultsChannel.send({files: [attachment]}).then((resultsChannelMessage) => {
                    // send a response message to the message author with the link to the table image
                    notificationsChannel.info(
                        `Lobby #${scoresCalculation.table.lobbyNumber} results calculated: ${resultsChannelMessage.url}`,
                        mentions
                    );
                });

            } catch (error) {
                notificationsChannel.warn(
                    "Couldn't calculate lobby results.",
                    mentions
                );
            }
        });
    });
}
