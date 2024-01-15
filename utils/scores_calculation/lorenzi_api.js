const axios = require('axios')
const config = require('../../config');
const TableParser = require('./table_parser');
const {
    DUO_MODES,
    _3V3_MODES,
    _4V4_MODES,
    RACE_ITEMS_FFA,
    RACE_ITEMS_DUOS,
    RACE_ITEMS_3V3,
    RACE_ITEMS_4V4,
    RACE_SURVIVAL,
    RACE_ITEMLESS_1V1,
    RACE_ITEMLESS_FFA,
    RACE_ITEMLESS_DUOS,
    RACE_ITEMLESS_3V3,
    RACE_ITEMLESS_4V4,
    BATTLE_1V1,
    BATTLE_FFA,
    BATTLE_DUOS,
    BATTLE_3V3,
    BATTLE_4V4,
    INSTA_DUOS,
    INSTA_3V3,
    INSTA_4V4,
    LEADERBOARDS
} = require("../../db/models/lobby");

/**
 * A class for making requests to the Lorenzi API.
 */
class LorenziAPI {

    /**
     * Retrieves board data for a given board ID from the Lorenzi API.
     *
     * @param {string} id - The ID of the board to fetch data for.
     * @returns {object|null} Board data, or null if data retrieval failed.
     */
    async getBoard(id) {
        try {
            const query = '{ team(teamId:"' + id + '") { name, players { name, rating, ranking }, tiers { name, lowerBound, color }, ratingAverageByTeam, ratingMin, ratingScheme, ratingElo, { initial, scalingFactors }, ratingMk8dxMmr { initial, scalingFactors, baselines }, matchCount, matches (skip: 0, count: 100) { id, teamId, matchData, createDate, playDate } } }';
            const responseData = await this.makeRequest(query).catch(error => error);
            if (!responseData || !responseData.hasOwnProperty("team") || responseData instanceof Error) {
                return null;
            }
            responseData.team.players = this._parsePlayers(responseData);
            responseData.team.matches = this._parseMatches(responseData, id);
            return responseData.team;
        } catch (error) {
            return null;
        }
    }

    /**
     * Retrieves rating updates from a match ID from the Lorenzi API.
     *
     * @param {string} matchID
     * @returns {Object|null}
     */
    async getMatchRatingUpdates(matchID) {
        try {
            const query = '{ teamMatch(teamMatchId:"' + matchID + '") { ratingUpdates { name, rankingBefore, rankingAfter, ratingBefore, ratingAfter, firstMatch } } }';
            const responseData = await this.makeRequest(query).catch(error => error);
            if (!responseData || !responseData.hasOwnProperty("teamMatch") || !responseData.teamMatch.hasOwnProperty("ratingUpdates")) {
                return null;
            }
            return responseData.teamMatch.ratingUpdates;
        } catch (error) {
            return null;
        }
    }

    /**
     * Makes an HTTP request to the Lorenzi API.
     *
     * @param {string} data - The GraphQL query data to send in the request.
     * @returns {Object|null} The response data, or null if the request failed.
     */
    async makeRequest(data) {
        return new Promise(async (resolve, reject) => {
            try {
                const abortController = new AbortController()
                let timeoutID = setTimeout(() => {
                    abortController.abort();
                    reject("Request timed out.");
                }, 12000)

                const response = await axios.post(config.lorenzi_api_url, data, {headers: {'Content-Type': 'text/plain', signal: abortController.signal}});
                clearTimeout(timeoutID);
                if (response.status === 200) {
                    resolve(response.data.data);
                }
                resolve(null);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Returns an HTTP status of Lorenzi's Game Boars
     *
     * @returns {Promise}
     */
    async checkLorenziStatus() {
        return new Promise(async (resolve, reject) => {
            try {
                const abortController = new AbortController();
                const timeoutID = setTimeout(() => {
                    abortController.abort();
                    reject("Request timed out.");
                }, 2000);

                const response = await axios.head(config.lorenzi_api_url, {signal: abortController.signal});
                clearTimeout(timeoutID);

                resolve(response.status)
            } catch (error) {
                reject(error.message);
            }
        });
    }

    /**
     * Parse players from Lorenzi board
     *
     * @param responseData
     * @returns {*[]}
     * @private
     */
    _parsePlayers(responseData) {
        try {
            const boardHasPlayers = responseData.team.hasOwnProperty("players") && responseData.team.players;
            if (!boardHasPlayers) {
                return [];
            }

            let players = [];
            for (let [i, player] of responseData.team.players.entries()) {
                player.ranking = player.ranking + 1;
                player.rating = parseFloat(player.rating);
                players.push(player);
            }
            return players.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
        } catch (error) {
            return [];
        }
    }

    /**
     * Parse matches from Lorenzi board
     * The board data differ on a different modes, so this huge parsing...
     *
     * @param {Object} responseData
     * @param {string} boardID
     * @returns {Object}
     * @private
     */
    _parseMatches(responseData, boardID) {
        const boardHasMatches = responseData.team.matchCount > 0 && responseData.team.hasOwnProperty("matches") && responseData.team.matches;
        if (!boardHasMatches) {
            return [];
        }

        const getDefaultTeamsCount = (code) => {
            const defaultTeams = {
                [RACE_ITEMS_FFA]: 8,
                [RACE_ITEMS_DUOS]: 4,
                [RACE_ITEMS_3V3]: 2,
                [RACE_ITEMS_4V4]: 2,
                [RACE_SURVIVAL]: 8,
                [RACE_ITEMLESS_1V1]: 2,
                [RACE_ITEMLESS_FFA]: 4,
                [RACE_ITEMLESS_DUOS]: 4,
                [RACE_ITEMLESS_3V3]: 2,
                [RACE_ITEMLESS_4V4]: 2,
                [BATTLE_1V1]: 2,
                [BATTLE_FFA]: 4,
                [BATTLE_DUOS]: 2,
                [BATTLE_3V3]: 2,
                [BATTLE_4V4]: 2,
                [INSTA_DUOS]: 4,
                [INSTA_3V3]: 2,
                [INSTA_4V4]: 2,
            };

            if (defaultTeams.hasOwnProperty(code)) {
                return defaultTeams[code];
            }

            return null;
        }

        const getDefaultPlayerCount = (code) => {
            const defaultPlayers = {
                [RACE_ITEMS_FFA]: 8,
                [RACE_ITEMS_DUOS]: 8,
                [RACE_ITEMS_3V3]: 6,
                [RACE_ITEMS_4V4]: 8,
                [RACE_SURVIVAL]: 8,
                [RACE_ITEMLESS_1V1]: 2,
                [RACE_ITEMLESS_FFA]: 4,
                [RACE_ITEMLESS_DUOS]: 8,
                [RACE_ITEMLESS_3V3]: 6,
                [RACE_ITEMLESS_4V4]: 8,
                [BATTLE_1V1]: 2,
                [BATTLE_FFA]: 4,
                [BATTLE_DUOS]: 4,
                [BATTLE_3V3]: 6,
                [BATTLE_4V4]: 8,
                [INSTA_DUOS]: 8,
                [INSTA_3V3]: 6,
                [INSTA_4V4]: 8,
            };

            if (defaultPlayers.hasOwnProperty(code)) {
                return defaultPlayers[code];
            }

            return null;
        }

        const boardLobbyTypes = []
        for (let [code, id] of Object.entries(LEADERBOARDS)) {
            if (id === boardID) {
                boardLobbyTypes.push({code: code, nbTeams: getDefaultTeamsCount(code), nbPlayers: getDefaultPlayerCount(code)});
            }
        }

        const parsedMatches = [];
        const tableParser = new TableParser();
        for (let [i, match] of responseData.team.matches.entries()) {
            try {
                // parse data from the matchData string
                const matchData = JSON.parse(match.matchData)

                // initialize match data default values
                matchData.id = match.id;
                matchData.boardID = match.teamId;
                matchData.playDate = parseInt(match.playDate);
                matchData.lobbyNumber = "";
                matchData.lobbyType = "";
                matchData.lobbyName = "";

                // check match data keys
                const hasTitle = matchData.hasOwnProperty("title") && matchData.title;
                const hasTag = matchData.hasOwnProperty("teams") && matchData.teams.length > 0 && matchData.teams[0].hasOwnProperty("tag") && matchData.teams[0].tag;
                const hasName = matchData.hasOwnProperty("teams") && matchData.teams.length > 0 && matchData.teams[0].hasOwnProperty("name") && matchData.teams[0].name;

                // set lobby number
                let regexMatches = null;
                if (hasTitle) {
                    regexMatches = matchData.title.match(/#(\d+)/);
                } else if (hasTag) {
                    regexMatches = matchData.teams[0].tag.match(/#(\d+)/);
                } else {
                    regexMatches = matchData.teams[0].tag.match(/#(\d+)/ig);
                }
                if (regexMatches && regexMatches[1]) {
                    matchData.lobbyNumber = regexMatches[1];
                }

                // set lobby name and type
                if (hasTitle) {
                    matchData.lobbyName = matchData.title;
                    const splitTitle = matchData.title.split(" - ");
                    if (splitTitle && splitTitle.length > 1) {
                        matchData.lobbyType = tableParser.parseLobbyType(splitTitle[1]);
                    }
                } else if (hasTag && hasName) {
                    matchData.lobbyName = matchData.teams[0].name + " - " + matchData.teams[0].tag;
                    matchData.lobbyType = tableParser.parseLobbyType(matchData.teams[0].name);
                }

                // if lobby type was not found, set from matchData by teams, players and boardLobbyTypes of the current match
                if (null === matchData.lobbyType && boardLobbyTypes.length > 0) {
                    const nbTeams = matchData.teams.length;
                    const nbPlayers = matchData.teams.reduce((totalPlayers, team) => totalPlayers + team.players.length, 0);

                    for (let [i, boardLobbyType] of boardLobbyTypes.entries()) {
                        if (boardLobbyType.nbTeams === nbTeams && boardLobbyType.nbPlayers === nbPlayers) {
                            matchData.lobbyType = boardLobbyType.code;
                            break;
                        }
                    }
                }

                if (null === matchData.lobbyType) {
                    continue
                }

                // set teams
                let teams = [];
                const isTeamMode = DUO_MODES.includes(matchData.lobbyType) || _3V3_MODES.includes(matchData.lobbyType) || _4V4_MODES.includes(matchData.lobbyType) || [INSTA_DUOS, INSTA_3V3, INSTA_4V4].includes(matchData.lobbyType);
                if (!isTeamMode) {
                    for (let [key, team] of matchData.teams.entries()) {
                        for (let [key2, player] of team.players.entries()) {
                            teams.push({
                                name: player.name,
                                color: "",
                                players: [{
                                    name: player.name,
                                    flag: player.hasOwnProperty("flag") ? player.flag : "",
                                    scores: player.scores,
                                    score: player.scores.reduce((a, b) => a + b, 0),
                                    penalty: player.hasOwnProperty("penalty") ? Math.abs(player.penalty) : 0,
                                    boardRating: player.hasOwnProperty("boardRating") ? player.boardRating : null,
                                }],
                                score: player.scores.reduce((a, b) => a + b, 0),
                                penalty: player.hasOwnProperty("penalty") ? Math.abs(player.penalty) : 0,
                            });
                        }
                    }
                } else {
                    for (let [key, team] of matchData.teams.entries()) {
                        const players = [];
                        let teamScore = 0;
                        let teamPenalty = 0;
                        for (let [key2, player] of team.players.entries()) {
                            players.push({
                                name: player.name,
                                flag: player.hasOwnProperty("flag") ? player.flag : "",
                                scores: player.scores,
                                score: player.scores.reduce((a, b) => a + b, 0),
                                penalty: player.hasOwnProperty("penalty") ? Math.abs(player.penalty) : 0,
                                boardRating: player.hasOwnProperty("boardRating") ? player.boardRating : null,
                            });
                            teamScore += player.scores.reduce((a, b) => a + b, 0);
                            teamPenalty += player.hasOwnProperty("penalty") ? Math.abs(player.penalty) : 0;
                        }
                        teams.push({
                            name: team.tag,
                            color: team.hasOwnProperty("color") ? team.color : "",
                            players: players,
                            score: teamScore,
                            penalty: teamPenalty,
                        });
                    }
                }
                teams = tableParser.sortTeams(teams);
                matchData.teams = teams;

                // set the final match data
                parsedMatches.push(matchData);
            } catch (error) {
            }
        }
        return parsedMatches;
    }
}

module.exports = LorenziAPI;
