const client = require('../../client');
const config = require('../../config');
const Image = require('./table/image');
const LorenziAPI = require('./lorenzi_api');
const MatchCalculator = require('./match_calculator');
const TableParser = require('./table_parser');

/**
 * A class for calculating match scores based on a scores table and Lorenzi board data.
 */
class ScoresCalculation {

    static ERROR_UNSET = 0;
    static ERROR_FATAL = 1;
    static ERROR_CALCULATION = 2;
    static ERROR_PARSE = 3;
    static ERROR_LORENZI_BOARD = 4;
    static ERROR_SUBMITTED_MATCH_NOT_FOUND = 5;
    static ERROR_SUBMITTED_MATCH_CALCULATION = 6;

    /**
     * Get the error type if any error occurred during calculation.
     *
     * @returns {number} The error type of ScoresCalculation.ERROR_
     */
    get errorType() {
        return this._errorType;
    }

    /**
     * Get the error message if any error occurred during calculation.
     *
     * @returns {string} The error message, or an empty string if there was no error.
     */
    get error() {
        return this._error;
    }

    /**
     * Get the parsed table data.
     *
     * @returns {Object|null} The parsed table results template table data, or null if it couldn't be parsed.
     */
    get table() {
        return this._table;
    }

    /**
     * @property {string} _error - error message of what went wrong when calculation failed
     * @property {Object | null} _table - parsed table of the table template that was provided to the _calculate() method
     * @property {Object | null} _image - generated image (canvas buffer) of the match results
     * @property {Object | null} _result - results of the match
     * @property {Object | null} _board - fetched lorenzi board data

     * @constructor
     */
    constructor() {
        this._error = "";
        this._errorType = ScoresCalculation.ERROR_UNSET;
        this._template = "";
        this._table = null;
        this._image = null;
        this._result = null;
        this._board = null;
    }

    /**
     * Generate results image from the provided table results template
     *
     * @param {string} table - the finished table results template to calculate match results from.
     *
     * @returns {Buffer|null} A base64 encoded image, or null if it couldn't be retrieved.
     */
    async generateResultsTable(table) {
        // calculate scores
        let results = null;
        try {
            results = await this.calculate(table);
        } catch (error) {
            if (ScoresCalculation.ERROR_UNSET === this._errorType) {
                this._errorType = ScoresCalculation.ERROR_FATAL;
            }
            return null;
        }

        // generate image
        const imageBuffer = await this.drawTable();
        if (null === results || null === imageBuffer) {
            if (ScoresCalculation.ERROR_UNSET === this._errorType) {
                this._errorType = ScoresCalculation.ERROR_FATAL;
            }
            return null;
        }

        return imageBuffer;
    }

    /**
     * Calculate match scores based on the provided table results template and Lorenzi board data.
     *
     * @param {string} table - the finished table results template to calculate match results from.
     *
     * @returns {Object|null} The calculated match results, or null if an error occurred during calculation.
     */
    async calculate(table) {
        this._errorType = ScoresCalculation.ERROR_UNSET;

        // parse table template
        const tableParser = new TableParser();
        this._template = table;
        this._table = tableParser.parse(table);
        if (null === this._table) {
            this._errorType = ScoresCalculation.ERROR_PARSE;
            this._error = "Could not parse table results template.";
            this._error += " " + tableParser.error;
            return null;
        }

        // fetch board data from Lorenzi based on the provided table
        this._board = await new LorenziAPI().getBoard(this._table.boardID);
        if (null === this._board) {
            this._errorType = ScoresCalculation.ERROR_LORENZI_BOARD;
            this._error = "Could not fetch board data from gb.lorenzi.com";
            return null;
        }

        // check if the parsed match was already submitted
        // if it was, then show results for that match instead
        // only 100 previous matches are available
        // matches older than 100th latest match on Lorenzi board will be calculated as a new match
        if (this._isSubmittedMatch()) {
            const submittedMatch = await this._getSubmittedMatch();
            if (submittedMatch) {
                this._result = new MatchCalculator(null, "", null, this._board.tiers).calculateSubmittedMatch(submittedMatch);
                if (null === this._result) {
                    this._errorType = ScoresCalculation.ERROR_SUBMITTED_MATCH_CALCULATION;
                    this._error = "Could not calculate submitted match scores.";
                }
                return this._result;
            }

            // the submitted match was not found
            this._errorType = ScoresCalculation.ERROR_SUBMITTED_MATCH_NOT_FOUND;
            this._error = `Could not fetch a submitted match #${this._table.lobbyNumber}`;
            return null;
        }

        // match wasn't submitted yet
        // or maybe is older than 100th latest match on the board, but anyway
        // show results from the parsed table and results submissions channel

        // calculate match predictions
        this._result = await this._predictMatch();

        // set calculation error type if no error data type is set
        if (null === this._result && this._errorType === ScoresCalculation.ERROR_UNSET) {
            this._errorType = ScoresCalculation.ERROR_CALCULATION;
        }
        this._error = "Could not calculate scores." + ("" !== this.error ? " " + this._error : "");

        return this._result;
    }

    /**
     * Draws a table for the calculated match
     *
     * @param {boolean} useCache
     *
     * @returns {Buffer|null} A base64 encoded image, or null if it couldn't be retrieved.
     */
    async drawTable(useCache = false) {
        if (useCache && null !== this._image) {
            return this._image;
        }
        if (null === this._result) {
            return null;
        }

        this._image = await new Image().draw(this._result, this._table, this._board);
        return this._image;
    }

    /**
     * Get the error message based on the error type
     *
     * @param {number} errorType
     * @returns
     */
    getErrorMessage(errorType) {
        let messages = [];
        messages.push("Couldn't calculate lobby results.");

        switch (errorType) {
            case ScoresCalculation.ERROR_PARSE:
                messages.push("Please provide a valid table template.");
                break;
            case ScoresCalculation.ERROR_LORENZI_BOARD:
                messages.push("Lorenzi's Game Boards are down. Try later.");
                break;
            case ScoresCalculation.ERROR_SUBMITTED_MATCH_NOT_FOUND:
                messages.push("\nCheck if the the submitted lobby number exists.");
                messages.push("You can view a maximum of 100 previously submitted lobbies.");
                break;
            case ScoresCalculation.ERROR_SUBMITTED_MATCH_CALCULATION:
                messages.push("Unable to retrieve results for the submitted match.");
                break;
        }

        return messages.join("\n");
    }

    /**
     * Get rating settings based on the rating scheme from the lorenzi board
     *
     * @returns {Object|null}
     */
    _getRatingSettings() {
        // set rating settings based on the rating scheme from lorenzi board
        const ratingSettingsKey = ("rating" + this._board.ratingScheme.charAt(0).toUpperCase() + this._board.ratingScheme.toLowerCase().slice(1)).replace(/_([a-z])/g, function (match, group) {
            return group.toUpperCase();
        })
        const ratingSettings = this._board.hasOwnProperty(ratingSettingsKey) ? this._board[ratingSettingsKey] : null;
        if (null === ratingSettings) {
            return null;
        }
        ratingSettings.scheme = this._board.ratingScheme;
        ratingSettings.ratingAverageByTeam = this._board.ratingAverageByTeam;
        ratingSettings.ratingMin = this._board.ratingMin;
        return ratingSettings;
    }

    /**
     * Checks if the current match was already submitted to the Lorenzi board or not
     *
     * @returns {boolean}
     */
    _isSubmittedMatch() {
        if (0 === this._board.matchCount || 0 === this._board.matches.length) {
            return false;
        }

        // get matches with the same lobby number
        const matches = this._board.matches.filter(match => parseInt(this._table.lobbyNumber) === parseInt(match.lobbyNumber));
        if (0 === matches.length) {
            return false;
        }

        // check if any matches are equal
        for (let [key, match] of matches.entries()) {
            if (this._areMatchesEqual(this._table, match)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the latest submitted match on the Lorenzi board
     *
     * @returns {Object|null}
     */
    _getLatestSubmittedMatch() {
        return this._board.matchCount > 0 && this._board.matches.length > 0 ? this._board.matches[0] : null;
    }

    /**
     * Get submitted match data from the Lorenzi board by the lobby number and players of the current table lobby number
     *
     * @returns {Object|null}
     */
    async _getSubmittedMatch() {
        // get matches with the same lobby number
        const matches = this._board.matches.filter(match => parseInt(this._table.lobbyNumber) === parseInt(match.lobbyNumber));
        if (0 === matches.length) {
            return null;
        }

        // multiple lobbies can have same numbers
        // this checks if the parsed table is already on the Lorenzi
        let selectedMatch = null;
        for (const match of matches) {
            if (this._areMatchesEqual(match, this._table)) {
                selectedMatch = match;
                break;
            }
        }

        if (null === selectedMatch) {
            return null;
        }

        // fetch match rating updates data from Lorenzi
        // it could have been done earlier, but this way the first Lorenzi call is lighter,
        // and a lot of times we don't need to fetch previous match rating updates if we are predicting a match (main functionality)
        const ratingUpdates = await new LorenziAPI().getMatchRatingUpdates(selectedMatch.id);
        if (null === ratingUpdates) {
            return null;
        }
        selectedMatch.ratingUpdates = ratingUpdates;
        this._table.lobbyType = selectedMatch.lobbyType;
        this._table.lobbyName = selectedMatch.lobbyName;

        return selectedMatch;
    }

    /**
     * Gets result submissions table templates from the #results-submissions channel.
     * Returns all templates. Not specific to the current board. It will get filtered later.
     * Order of the table templates are from oldest to newest.
     *
     * @returns {array}
     */
    async _getResultsSubmissionsMessages() {
        // get results submissions channel
        const channel = client.channels.cache.find(channel => channel.name.toLowerCase() === config.channels.ranked_results_submissions_channel.toLowerCase());
        if (!channel) {
            return [];
        }

        // get channels latest 100 messages
        const discordMessages = await channel.messages.fetch({limit: 100}).catch(error => error);
        if (!discordMessages || 0 === discordMessages.size || discordMessages instanceof Error) {
            return [];
        }

        // extract scores from discord messages
        const messages = [];
        discordMessages.forEach(discordMessage => {
            if (discordMessage.content && discordMessage.createdTimestamp) {
                const regex = /```([\s\S]*?)```/;
                const match = regex.exec(discordMessage.content);
                if (match) {
                    messages.push({"message": match[1], "datetime": new Date(discordMessage.createdTimestamp)});
                } else {
                    messages.push({"message": discordMessage.content, "datetime": new Date(discordMessage.createdTimestamp)});
                }
            }
        });

        return messages.reverse();
    }

    /**
     * Calculate match prediction of the current table match
     * based on the latest submitted match on the Lorenzi board and un-submitted results submissions in #results-submissions discord channel.
     *
     * @returns {Object|null}
     */
    async _predictMatch() {
        // prepare the table parser
        const tableParser = new TableParser();

        // get all results submissions that are not on the board
        const resultsSubmissionsMessages = await this._getResultsSubmissionsMessages();

        // get the latest submitted match on the board
        const latestSubmittedMatch = this._getLatestSubmittedMatch();

        // get the date when the latest submitted match was added to the board
        // if there is no latest submitted match, then we won't use it in calculations
        let latestSubmittedMatchDate = null;
        if (latestSubmittedMatch) {
            latestSubmittedMatchDate = latestSubmittedMatch.playDate > 0 ? new Date(latestSubmittedMatch.playDate) : new Date(latestSubmittedMatch.date);
        }

        // get the date of creation of our match's results submission in the #results-submissions discord channel
        // if our match was not yet posted in the results submissions channel, then we won't use it
        let currentMatchResultsSubmissionDate = null;
        const resultsSubmissionsCache = {};
        for (let [key, resultsSubmissionsMessage] of resultsSubmissionsMessages.entries()) {

            // parse results submission
            // also add it to the parsed results submissions cache, so we won't have to later parse it again
            const resultsSubmission = tableParser.parse(resultsSubmissionsMessage.message);
            const cacheKey = resultsSubmissionsMessage.message.replace(/\s/g, ' ');
            resultsSubmissionsCache[cacheKey] = resultsSubmission;
            if (!resultsSubmission) {
                continue;
            }

            // if the current match and the results submission match are equal, then set the current match's results submission date
            if (this._areMatchesEqual(this._table, resultsSubmission)) {
                currentMatchResultsSubmissionDate = resultsSubmissionsMessage.datetime;
                break;
            }
        }

        // get matches from results submissions, that weren't submitted yet and that are not our match or are not newer than our match and also that are newer than the latest submitted match on the board
        // filters are described inside the loop
        let matches = {};
        for (let [key, resultsSubmissionsMessage] of resultsSubmissionsMessages.entries()) {
            // parse results submission
            // either from cache or by the table parser
            let resultsSubmission;
            const cacheKey = resultsSubmissionsMessage.message.replace(/\s/g, ' ');
            if (resultsSubmissionsCache.hasOwnProperty(cacheKey)) {
                resultsSubmission = resultsSubmissionsCache[cacheKey];
            } else {
                resultsSubmission = tableParser.parse(resultsSubmissionsMessage.message);
            }
            if (!resultsSubmission) {
                continue;
            }

            // skip duplicated matches
            if (matches.hasOwnProperty(cacheKey)) {
                continue;
            }

            // allow only same board lobbies
            if (resultsSubmission.boardID !== this._table.boardID) {
                continue;
            }

            // check if the current results submission is equal to the latest submitted match
            // if it is then skip it
            if (latestSubmittedMatch && this._areMatchesEqual(resultsSubmission, latestSubmittedMatch)) {
                continue;
            }

            // check if the current results submission is equal to the current match
            // if it is then skip it
            if (this._areMatchesEqual(resultsSubmission, this._table)) {
                continue;
            }

            // skip matches that were posted to the results submissions before the latest submitted match on the board
            //
            // if the latest submitted match on the board exists and the results submission was posted before this date
            // do not add this match
            if (latestSubmittedMatch && resultsSubmissionsMessage.datetime < latestSubmittedMatchDate) {
                continue;
            }

            // skip matches that were posted to the results submissions after our match
            //
            // if the current match is in the results submissions and the results submission was posted after this date
            // do not add this match
            if (currentMatchResultsSubmissionDate && resultsSubmissionsMessage.datetime > currentMatchResultsSubmissionDate) {
                continue;
            }

            // this result submission is newer than the latest submitted match and older than our current match
            // add it to the array of results submissions that are still not on the board
            matches[cacheKey] = resultsSubmission;
        }

        // also push our table match into the final object of matches as well
        // only if there isn't yet
        const templateCacheKey = this._template.replace(/\s/g, ' ');
        if (!matches.hasOwnProperty(templateCacheKey)) {
            matches[templateCacheKey] = this._table;
        }

        // group matches by lobby numbers
        let matchesByNumber = new Map();
        for (let [key, match] of Object.entries(matches)) {
            if (!matchesByNumber.has(match.lobbyNumber)) {
                matchesByNumber.set(match.lobbyNumber, []);
            }
            matchesByNumber.get(match.lobbyNumber).push(match);
        }

        // filter out matches with the same match number that have the same player names and may have different order of players but the scores per player and penalty sums are the same
        // this can happen only if players or teams in the template changed (in the provided user table or in results submissions)
        // shouldn't happen
        for (let [lobbyNumber, matches] of matchesByNumber.entries()) {
            for (let i = 0; i < matches.length - 1; i++) {
                for (let j = i + 1; j < matches.length; j++) {
                    if (this._areMatchesEqual(matches[i], matches[j])) {
                        if (i < j) {
                            matches[i] = null;
                        } else {
                            matches[j] = null;
                        }
                    }
                }
            }
            matchesByNumber.set(lobbyNumber, matches.filter(item => item !== null));
        }

        // filter out matches with the same match number that have the same player names and players are in the same order without checking scores or penalties difference
        // this situation can happen if a user submits one match, but made a mistake and posted the same match again with corrected scores
        for (let [lobbyNumber, matches] of matchesByNumber.entries()) {
            for (let i = 0; i < matches.length - 1; i++) {
                for (let j = i + 1; j < matches.length; j++) {
                    if (this._areMatchesDuplicated(matches[i], matches[j])) {
                        if (i < j) {
                            matches[i] = null;
                        } else {
                            matches[j] = null;
                        }
                    }
                }
            }
            matchesByNumber.set(lobbyNumber, matches.filter(item => item !== null));
        }

        // convert matches into an array for further simpler processing
        matches = [];
        for (let [, groupedMatches] of matchesByNumber.entries()) {
            for (let match of groupedMatches) {
                matches.push(match);
            }
        }

        // now we should have all results submissions matches ready
        // that weren't submitted yet and that are not newer than our match

        if (0 === matches.length) {
            this._error = "No matches found.";
            return null;
        }

        // get rating settings from the board
        const ratingSettings = this._getRatingSettings();
        if (null === ratingSettings) {
            this._error = "Board contains unsupported rating scheme";
            return null;
        }

        // set original board ratings for all players in all matches
        // first get all players and set initial ratings for them by a rating system
        const playersRatings = {};
        for (const match of matches) {
            for (const [teamKey, team] of Object.entries(match.teams)) {
                for (const player of team.players) {
                    playersRatings[player.name] = parseFloat(ratingSettings.initial);
                }
            }
        }

        // set ratings for all players from all matches from the lorenzi board
        for (const [playerName, player] of Object.entries(playersRatings)) {
            const matchedPlayer = this._board.players.find(row => row.name === playerName);
            if (matchedPlayer) {
                playersRatings[playerName] = parseFloat(matchedPlayer.rating);
            }
        }

        // calculate results
        let result = null;
        for (const match of matches) {
            // set the latest board ratings for all players of the current match
            for (const team of match.teams) {
                for (const player of team.players) {
                    player.boardRating = parseFloat(playersRatings[player.name]);
                }
            }

            // calculate match
            result = new MatchCalculator(match.teams, match.lobbyType, ratingSettings, this._board.tiers).calculate();
            if (null === result) {
                this._error = `Could not calculate match #${match.lobbyType} results.`;
                return null;
            }

            // update players' original board ratings from the final rating of the last match
            for (const [playerName, playerResults] of Object.entries(result)) {
                playersRatings[playerName] = parseFloat(playerResults.finalRating);
            }

            // get new players, that are not yet on the board
            const boardPlayers = this._board.players.map(boardPlayer => boardPlayer.name);
            const newPlayers = Object.keys(result).filter(name => !boardPlayers.includes(name));

            // calculate board ratings
            MatchCalculator.calculateBoardRatings(result, this._board.players);

            // calculate board rankings
            MatchCalculator.calculateBoardRankings(result, this._board.players, newPlayers);
        }

        return result;
    }

    /**
     * Checks if two matches are equal
     * Matches are equal if they are on the same board, have same number, lobby type, team penalties, players and players have the same scores.
     *
     * @param {Object|null} match1
     * @param {Object|null} match2
     * @returns {boolean}
     */
    _areMatchesEqual = (match1, match2) => {
        if (null === match1 || null === match2) {
            return false;
        }

        const areTeamsEqual = (teams1, teams2) => {
            if (teams1.length !== teams2.length) {
                return false;
            }

            if (!this._areTeamPenaltiesSame(teams1, teams2)) {
                return false;
            }

            const areScoresEqual = (player1, player2) => {
                const totalScore1 = player1.scores.reduce((a, b) => a + b, 0) - Math.abs(player1.penalty);
                const totalScore2 = player2.scores.reduce((a, b) => a + b, 0) - Math.abs(player2.penalty);
                return totalScore1 === totalScore2;
            }

            for (const team1 of match1.teams) {
                for (const player1 of team1.players) {
                    // Iterate through players in match2
                    let hasCorrespondingPlayer = false;
                    for (const team2 of match2.teams) {
                        const correspondingPlayer2 = team2.players.find(player2 => player2.name === player1.name);

                        // If a corresponding player is found in match2, compare the scores
                        if (correspondingPlayer2) {
                            hasCorrespondingPlayer = true;
                            if (!areScoresEqual(player1, correspondingPlayer2)) {
                                return false;
                            }
                        }
                    }
                    if (!hasCorrespondingPlayer) {
                        return false;
                    }
                }
            }

            return true;
        };

        return (
            match1.boardID === match2.boardID &&
            parseInt(match1.lobbyNumber) === parseInt(match2.lobbyNumber) &&
            match1.lobbyType === match2.lobbyType &&
            areTeamsEqual(match1.teams, match2.teams)
        );
    };

    /**
     * Checks if two matches are duplicated.
     * Matches are duplicated if they are on the same board, have same number, lobby type and teams have same players in the same order.
     *
     * @param {Object|null} match1
     * @param {Object|null} match2
     * @returns {boolean}
     */
    _areMatchesDuplicated = (match1, match2) => {
        if (null === match1 || null === match2) {
            return false;
        }

        const areTeamsDuplicates = (teams1, teams2) => {
            if (teams1.length !== teams2.length) {
                return false;
            }

            const areTablePlayersOrdersEqual = (team1, team2) => team1.tablePlayersOrder.every((player, index) => player === team2.tablePlayersOrder[index]);
            return teams1.every(team1 => teams2.some(team2 => areTablePlayersOrdersEqual(team1, team2)));
        };

        return (
            parseInt(match1.boardID) === parseInt(match2.boardID) &&
            parseInt(match1.lobbyNumber) === parseInt(match2.lobbyNumber) &&
            match1.lobbyType === match2.lobbyType &&
            areTeamsDuplicates(match1.teams, match2.teams)
        );
    };

    /**
     * Check if teams have the same penalties
     * @param teams1
     * @param teams2
     * @returns {boolean}
     * @private
     */
    _areTeamPenaltiesSame(teams1, teams2) {
        if (teams1.length !== teams2.length) {
            return false;
        }

        for (const team1 of teams1) {
            for (const team2 of teams2) {
                const isSameTeam = JSON.stringify(team1.tablePlayersOrder) === JSON.stringify(team2.tablePlayersOrder);
                if (isSameTeam && team1.penalty !== team2.penalty) {
                    return false;
                }
            }
        }

        return true;
    }
}

module.exports = ScoresCalculation;
