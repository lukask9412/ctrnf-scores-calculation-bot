const { MessageAttachment } = require('discord.js');
const ScoresCalculation = require('../utils/scores_calculation/scores_calculation');

module.exports = {
    name: 'scores',
    description: 'Calculates lobby results',
    cooldown: 10,
    usage: '[table]',
    aliases: ['score', 'predict'],
    guildOnly: true,
    execute(message) {
        // validate command's message content
        const table = message.content.replace(/^!(scores|score|predict)/i, '').trim().replace(/`/g, '');
        const mentions = message && message.author ? [message.author.id] : [];
        if (!table.length) {
            message.delete().then(() => {
                message.channel.warn(
                    "Couldn't calculate lobby results." + "\n" + "Please provide a valid table template.",
                    mentions
                );
            });
            return;
        }

        message.delete().then(() => {
            message.channel.info('Calculating lobby results...').then(async (m) => {

                // calculate scores
                const scoresCalculation = new ScoresCalculation();
                const imageBuffer = await scoresCalculation.generateResultsTable(table);
                if (null === imageBuffer) {
                    m.delete().then(() => message.channel.warn(
                        scoresCalculation.getErrorMessage(scoresCalculation.errorType),
                        mentions
                    ));
                    return;
                }

                // send an image with results
                m.delete().then(() => {
                    try {
                        const attachment = new MessageAttachment(imageBuffer, `${scoresCalculation.table.lobbyType}_${scoresCalculation.table.lobbyNumber}.png`);
                        message.channel.send({ files: [attachment] });
                    } catch (error) {
                        message.channel.warn(
                            "Couldn't calculate lobby results.",
                            mentions
                        );
                    }
                });
            });
        });
    },
};
