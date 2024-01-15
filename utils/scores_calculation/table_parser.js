const {
    DUO_MODES,
    _3V3_MODES,
    _4V4_MODES,
    INSTA_DUOS,
    INSTA_3V3,
    INSTA_4V4,
    LEADERBOARDS,
} = require('../../db/models/lobby');

/**
 * A class for parsing scores tables and extracting relevant information.
 */
class TableParser {

    get template() {
        return this._template;
    }

    /**
     * Get the error message if any error occurred during table parsing.
     *
     * @returns {string} The error message, or an empty string if there was no error.
     */
    get error() {
        return this._error;
    }

    /**
     * @property {string} _error - The error message of what went wrong when parsing the table
     * @constructor
     */
    constructor() {
        this._error = "";
        this._template = "";
    }

    /**
     * Parses a scores table and extracts relevant information.
     *
     * @param {string} table - The unprocessed table template to parse.
     * @returns {null | Object} Returns the parsed data or null if parsing fails.
     */
    parse(table) {
        this._error = "";
        this._template = "";

        try {
            // get lines from the table string
            let lobbyComments = this._getLobbyComments(table);
            let lines = this._getLines(table);
            if (null == lines) {
                throw new Error("Invalid table format. Lobby header not found.");
            }

            // parse lobby data from the headrr
            const [lobbyNumber, lobbyType, lobbyName] = this._getHeaderData(lines[this._getHeaderLinePosition(lines)]);
            if (null === lobbyNumber || null === lobbyType || null === lobbyName) {
                throw new Error("Could not parse lobby number / type / name.");
            }

            // temp data to correctly parse the table
            // used for accessing these variables across the class
            // stored in an object, so we don't have a lot of class properties
            this._data = {
                template: [],
                processedPlayers: [],
                isTeamMode: this._isTeamMode(lobbyType),
                team: null,
                teams: [],
                teamNameCharCode: "A".charCodeAt(0),
                isLastLineTeam: false,
                previousLineType: "",
            }

            this._data.template.push(lines[0] + "\n\n");

            // parse players and teams
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];

                // save comment line
                if (this._isCommentLine(line)) {
                    this._data.previousLineType = "comment";
                    continue;
                }

                // process penalty line
                if (this._isPenaltyLine(line)) {
                    this._processTeamPenaltyLine(line)
                    continue;
                }

                // process a line that is not a player = possibly a team
                if (this._isPossibleTeamLine(line)) {
                    // if this is a last line, and it is a team (= not a player), skip it
                    const isLastTemplateLineAndTeam = i === lines.length - 1;
                    if (isLastTemplateLineAndTeam) {
                        continue;
                    }

                    this._processTeamLine(line);
                    this._data.previousLineType = "team";
                    continue;
                }

                // process player
                if (this._isPlayerLine(line)) {
                    const result = this._processPlayerLine(line);
                    if (!result) {
                        throw new Error(this.error ? this.error : "Could not parse players.");
                    }
                    this._data.previousLineType = "player";
                }
            }

            // filter out empty teams (basically any lines that are not comments, players, penalties or are tagged as teams but have no player)
            if (this._data.teams) {
                for (let i = this._data.teams.length - 1; i >= 0; i--) {
                    let team = this._data.teams[i];
                    if (team.players.length === 0) {
                        this._data.teams.splice(i, 1);
                        for (let [j, line] of this._template.entries()) {
                            if (line.trim() === team.name.trim()) {
                                this._data.template.splice(j, 1);
                            }
                        }
                    }
                }
            }

            this._template = (lobbyComments.length ? lobbyComments.join("\n") + "\n\n" : "") + this._data.template.join("").replace(/\n{3,}/g, '\n\n').trim();

            // validate teams and their players
            if (!this._areTeamsValid()) {
                throw new Error("Invalid teams.");
            }

            // sort teams by ratings (descending order) and add positions
            this._data.teams = this.sortTeams(this._data.teams);

            // return parsed data
            return {
                boardID: LEADERBOARDS[lobbyType],
                lobbyNumber: lobbyNumber,
                lobbyName: lobbyName,
                lobbyType: lobbyType,
                isTeamMode: this._data.isTeamMode,
                teams: this._data.teams,
            };
        } catch (error) {
            this._template = "";
            this._error = error;
            return null;
        }
    }

    /**
     * Parses a string and returns a lobby type if found.
     *
     * @param {string} string
     * @returns {string|null}
     * @private
     */
    parseLobbyType(string) {
        let lobbyType = string.toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/ vs\. /g, 'v')
            .replace(/ vs /g, 'v')
            .replace(/ v /g, 'v')
            .replace(/vs\./g, 'v')
            .replace(/vs/g, 'v')
            .replace(/ /g, '_');
        if (!lobbyType.startsWith('insta') && !lobbyType.startsWith('battle')) {
            lobbyType = "race_" + lobbyType;
        }

        if (!LEADERBOARDS.hasOwnProperty(lobbyType)) {
            for (let [boardLobbyType, leaderboard] of Object.entries(LEADERBOARDS)) {
                if (lobbyType.includes(boardLobbyType)) {
                    lobbyType = boardLobbyType;
                    break;
                }
            }
        }

        // check lobby type
        if (!LEADERBOARDS.hasOwnProperty(lobbyType) || null === LEADERBOARDS[lobbyType]) {
            return null;
        }

        return lobbyType;
    }

    /**
     * Parses a lobby number and type and returns a lobby name
     *
     * @param {Number} lobbyNumber
     * @param {string} lobbyType
     *
     * @returns {string}
     */
    _parseLobbyName(lobbyNumber, lobbyType) {
        if (lobbyType.includes("#")) {
            lobbyType = lobbyType.split("#", 1)[0].trim();
        }
        return `Lobby #${lobbyNumber} - ${lobbyType}`;
    }

    /**
     * Get comments before lobby
     * @param table
     * @returns {*[]}
     * @private
     */
    _getLobbyComments(table) {
        const parts = table.split(/Lobby/i);
        if (parts.length < 2) {
            return [];
        }

        let allLines = parts[0].split('\n').map(line => line.trim()).filter(line => line !== '');
        const commentsBeforeLobby = [];
        for (let [key, line] of allLines.entries()) {
            if (this._isCommentLine(line)) {
                commentsBeforeLobby.push(line);
            }
        }
        return commentsBeforeLobby;
    }

    /**
     * Return string table as an array of lines
     *
     * @param {string} table
     * @returns
     */
    _getLines(table) {
        let lines = table.replace(/.*?(?=Lobby)/, '').split('\n').map(line => line.trim()).filter(line => line !== '');
        const headerLinePosition = this._getHeaderLinePosition(lines);
        if (-1 === headerLinePosition) {
            return null;
        }
        return lines.slice(headerLinePosition);
    }

    _getHeaderLinePosition(lines) {
        const headerPattern = this._getHeaderRegex();
        return lines.findIndex(line => headerPattern.test(line));
    }

    _getHeaderRegex() {
        return /^(lobby)\s*#?(\d+)\s*-?\s*(.+)/i;
    }

    _getHeaderData(header) {
        const lobbyMatch = header.match(this._getHeaderRegex());

        if (lobbyMatch && lobbyMatch[2] && lobbyMatch[3]) {
            const lobbyNumber = parseInt(lobbyMatch[2], 10);
            const lobbyType = this.parseLobbyType(lobbyMatch[3].trim());
            const lobbyName = this._parseLobbyName(lobbyNumber, lobbyMatch[3].trim());
            return [lobbyNumber, lobbyType, lobbyName];
        }

        return [null, null, null];
    }

    _isTeamMode(lobbyType) {
        return DUO_MODES.includes(lobbyType) || _3V3_MODES.includes(lobbyType) || _4V4_MODES.includes(lobbyType) || [INSTA_DUOS, INSTA_3V3, INSTA_4V4].includes(lobbyType);
    }

    _isPossibleTeamLine(line) {
        if (!this._data.isTeamMode) {
            return false;
        }

        const isPlayerLine = this._isPlayerLine(line);
        const matches = line.match(this._getTeamRegex());
        if (isPlayerLine && null !== matches && matches[1] && matches[2]) {
            return true;
        }

        return !isPlayerLine;
    }

    _isPlayerLine(line) {
        return null !== line.match(this._getPlayerRegex());
    }

    _getPlayerRegex() {
        return /^(\b(?!Bonus|Penalty\b)\S+|\b(?:Bonus|Penalty)\S+)(?:\s+\[?([A-Za-z\-_]{0,7})]?)?\s+((?:[+\-]?[0-9|])+)(\s+\(?(?:[+\-]?[0-9]?)+\)?)?(?:\s.*)?$/i;
    }

    _processTeamLine(line) {
        // if the last line was a team line, then revert the default team name character
        if (this._data.isLastLineTeam) {
            this._data.teamNameCharCode--;
        }

        // try to parse a team name and color
        const [name, color, penalty] = this._getTeamData(line);

        // initialize the current team
        this._data.team = {
            name: name,
            color: color,
            players: [],
            score: 0,
            penalty: penalty,
        };

        // if the last line was a team, remove that team from teams
        // we will use this line as a team instead
        if (this._data.teams && this._data.teams.length > 0 && this._data.isLastLineTeam) {
            this._data.template.pop();
            this._data.teams.pop();
        }
        this._data.isLastLineTeam = true;

        // set team into an array of teams
        this._data.teams.push(this._data.team);

        // set next char as next default team name
        this._data.teamNameCharCode++;

        // push line into the template
        if (["penalty", "player"].includes(this._data.previousLineType)) {
            this._data.template.push("\n");
        }
        this._data.template.push(line + "\n");
    }

    _getTeamData(line) {
        // try to parse a team name and color
        const matches = line.match(this._getTeamRegex());
        const defaultName = "Team " + String.fromCharCode(this._data.teamNameCharCode);
        let name = defaultName;
        let color = ""
        let penalty = 0;
        if (null !== matches) {
            name = this._removeEmojis(!matches[2] && !matches[3] ? matches[0] : matches[1]);
            if (0 === name.length) {
                name = defaultName;
            }
            color = matches[2] ? matches[2] : "";
            penalty = matches[3] ? -1 * this._sumFromString(matches[3]) : 0;
        }
        return [name, color, penalty];
    }

    _getTeamRegex() {
        return /^(.*?)\s*(#[0-9A-Fa-f]+)?(?:\s*(\((?:[+\-]?[0-9])+\)?))?(?:\s[^#(]*)?$/;
    }

    _areTeamsValid() {
        return !(0 === this._data.teams.length || this._data.teams.some(team => team.players.length === 0));
    }

    /**
     * sort players within teams by rating (descending order) and adds team and player positions
     */
    sortTeams(teams) {
        // preserve table order of the teams in a table_order key
        teams.forEach((team, index) => {
            team.tableOrder = index;
        });

        let teamPosition = 0;
        let nbTeamsSamePositionStack = 1;

        // sort teams by their score
        teams.sort((a, b) => (b.score - b.penalty) - (a.score - a.penalty));

        // calculate player positions based on teams
        teams.forEach((team, index) => {
            team.tablePlayersOrder = team.players.map(player => player.name);

            // calculate team position
            let previousTeamScore = 0;
            if (index > 0) {
                previousTeamScore = teams[index - 1].score - teams[index - 1].penalty;
            }
            const teamScore = team.score - team.penalty;
            if (0 === index || index > 0 && teamScore < previousTeamScore) {
                if (nbTeamsSamePositionStack > 0) {
                    teamPosition += nbTeamsSamePositionStack;
                    nbTeamsSamePositionStack = 1;
                } else {
                    teamPosition++;
                }
            } else {
                nbTeamsSamePositionStack++;
            }
            team.position = teamPosition;

            team.players.sort((a, b) => (b.scores.reduce((a, b) => a + b, 0) - b.penalty) - (a.scores.reduce((a, b) => a + b, 0) - a.penalty));
            team.players.forEach((player, playerIndex) => {
                player.inTeamPosition = playerIndex + 1;
            });
        });

        // Calculate overall player positions
        //
        // extract all players and their ratings
        const allPlayers = [];
        for (const team of teams) {
            allPlayers.push(...team.players);
        }

        // sort players based on scores in descending order
        allPlayers.sort((a, b) => (b.scores.reduce((a, b) => a + b, 0) - b.penalty) - (a.scores.reduce((a, b) => a + b, 0) - a.penalty));

        // assign overall scores based on the sorted order
        const playerOverallPositions = {};
        let playerPosition = 0;
        let nbPlayerSamePositionStack = 1;
        allPlayers.forEach((player, i) => {
            // calculate team position
            let previousPlayerScore = 0;
            if (i > 0) {
                previousPlayerScore = allPlayers[i - 1].scores.reduce((a, b) => a + b, 0) - allPlayers[i - 1].penalty;
            }
            const playerScore = player.scores.reduce((a, b) => a + b, 0) - player.penalty;
            if (0 === i || i > 0 && playerScore < previousPlayerScore) {
                if (nbPlayerSamePositionStack > 0) {
                    playerPosition += nbPlayerSamePositionStack;
                    nbPlayerSamePositionStack = 1;
                } else {
                    playerPosition++;
                }
            } else {
                nbPlayerSamePositionStack++;
            }
            playerOverallPositions[player.name] = playerPosition;
        });

        // set overall positions to the match data
        for (const team of teams) {
            for (const player of team.players) {
                player.position = playerOverallPositions[player.name];
            }
        }

        return teams;
    }

    _processPlayerLine(line) {
        let result = false;
        if (this._data.isTeamMode) {
            result = this._processTeamPlayer(line);
        } else {
            result = this._processSoloPlayer(line);
        }
        this._data.template.push(line + "\n");
        return result;
    }

    _processTeamPlayer(line) {
        // get player data
        const [name, flag, scores, score, boardRating, penalty] = this._getPlayerData(line);
        if (null === name) {
            this._error = "Could not parse players.";
            return false;
        }

        // validate duplicate players
        if (this._isPlayerDuplicated(name)) {
            this._error = "Duplicate player names.";
            return false;
        }

        // validate that the there is a team
        if (!this._data.team) {
            this._error = "Invalid team initialization.";
            return false;
        }

        // add player to the team
        this._data.team.players.push({name, flag, scores, score, penalty, boardRating,});
        this._data.team.score += score;
        this._data.team.penalty += penalty;
        this._data.isLastLineTeam = false;
        return true;
    }

    _processSoloPlayer(line) {
        // get player data
        const [name, flag, scores, score, boardRating, penalty] = this._getPlayerData(line);
        if (null === name) {
            this._error = "Could not parse players.";
            return false;
        }

        // validate duplicate players
        if (this._isPlayerDuplicated(name)) {
            this._error = "Duplicate player names.";
            return false;
        }

        // create a new team (team = player) = add a player into a team
        this._data.teams.push({
            name,
            color: "",
            score,
            penalty,
            players: [{name, flag, scores, score, penalty, boardRating,}],
        });
        return true;
    }

    _getPlayerData(line) {
        const matches = line.match(this._getPlayerRegex());
        if (!matches) {
            return [null, null, null, null, null];
        }
        const name = matches[1].trim();
        const flag = matches[2] || '';
        const scoresString = matches[3].split('|').slice(0, 32);
        let penalty = matches[4] ? this._sumFromString(matches[4]) : 0;
        const boardRating = null;
        const scores = scoresString.map(score => {
            score = "" === score ? "0" : score;
            if (score.includes("+")) {
                const nbs = score.split("+");
                let nb1 = parseInt(nbs[0] > 0 ? nbs[0] : 0);
                let nb2 = parseInt(nbs[1] > 0 ? nbs[1] : 0);
                return nb1 + nb2 > 99 ? 99 : nb1 + nb2;
            }
            if (score.includes("-")) {
                const nbs = score.split("-");
                let nb1 = parseInt(nbs[0] > 0 ? nbs[0] : 0);
                let nb2 = parseInt(nbs[1] > 0 ? nbs[1] : 0);
                if (nb2 > 0) {
                    penalty -= nb2;
                }
                return nb1 > 99 ? 99 : nb1;
            }
            let nb1 = parseInt(score);
            return nb1 > 99 ? 99 : nb1;
        });

        let score = scores.reduce((a, b) => a + b, 0);
        if (Number.isNaN(score)) {
            return null;
        }

        if (penalty < -99) {
            penalty = -99;
        } else if (penalty > 99) {
            penalty = 99;
        }
        penalty *= -1; // positive number is a penalty and a negative number is a positive penalty (meaning a bonus)
        if (-0 === penalty) {
            penalty = 0;
        }

        return [name, flag, scores, score, boardRating, penalty];
    }

    _isPlayerDuplicated(player) {
        if (this._data.processedPlayers.includes(player)) {
            return true;
        }
        this._data.processedPlayers.push(player);
        return false;
    }

    _isCommentLine(line) {
        return this._getCommentRegex().test(line.trim());
    }

    _getCommentRegex() {
        return /^(\/\/|#)/;
    }

    _processTeamPenaltyLine(line) {
        if (!(this._data.isTeamMode && ["penalty", "team", "player"].includes(this._data.previousLineType))) {
            return;
        }

        const matches = line.match(this._getPenaltyRegex());
        if (!matches) {
            return;
        }

        const lastTeam = this._data.teams[this._data.teams.length - 1];
        let penalty = matches[1] ? this._sumFromString(matches[1]) : 0;
        if (penalty < -99) {
            penalty = -99;
        } else if (penalty > 99) {
            penalty = 99;
        }
        penalty *= -1; // positive number is a penalty and a negative number is a positive penalty (meaning a bonus)
        if (-0 === penalty) {
            penalty = 0;
        }
        lastTeam.penalty += penalty;

        this._data.template.push(line + "\n");
        this._data.previousLineType = "penalty";
    }

    _isPenaltyLine(line) {
        return this._getPenaltyRegex().test(line.trim());
    }

    _getPenaltyRegex() {
        return /^(?:Penalty|Bonus)\s+((?:[+\-]?[0-9])+)\s*?$/i;
    }

    /**
     * Sums a string that consists of numbers separated by + or - signs.
     *
     * @param str
     * @returns {number}
     * @private
     */
    _sumFromString(str) {
        const match = str.replace(/[()]/g, "").trim();
        const numbers = match.split(/([+-])/).map(str => str.trim() === '' ? "0" : str.trim());
        if (isNaN(numbers[0])) {
            return 0;
        }
        let sum = parseFloat(numbers[0]);
        for (let i = 1; i < numbers.length; i += 2) {
            const operator = numbers[i];
            const number = parseFloat(numbers[i + 1]);

            if (operator === '+') {
                sum += number;
            } else if (operator === '-') {
                sum -= number;
            }
        }
        return sum;
    }

    _removeEmojis(text) {
        try {
            const pattern = "\\p{RGI_Emoji}";
            const regex = new RegExp("\\p{RGI_Emoji}", 'v');
            return text.replace(regex, '').trim();
        } catch (error) {
            return text;
        }
    }
}

module.exports = TableParser;
