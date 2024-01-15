const {RATING_SCHEME_ELO, RATING_SCHEME_MMR, DUO_MODES, _3V3_MODES, _4V4_MODES, INSTA_DUOS, INSTA_3V3, INSTA_4V4} = require('../../db/models/lobby');
const RatingSystemElo = require('./rating_system_elo');
const RatingSystemMmr = require('./rating_system_mmr');

/**
 * A class for calculating match results and rating changes based on the given data.
 */
class MatchCalculator {

    /**
     * @constructor
     * @param {Array} teams - Teams and players in the match.
     * @param {string} lobbyType - The type of the match for which the rating system is being defined.
     * @param {Object} ratingSettings - An object containing the rating system's configuration settings.
     *   - scheme {string} - The name of the rating scheme used by the system.
     *   - [Additional keys] - Depending on the specific rating system, there are values of algorithm variables needed to calculate the results.
     * @param {Array} boardTiers - Board tiers information
     */
    constructor(teams = null, lobbyType = "", ratingSettings = null, boardTiers = []) {
        this._teams = teams;
        this._lobbyType = lobbyType;
        this._ratingSettings = ratingSettings;
        this._boardTiers = boardTiers;
    }

    /**
     * Calculates match results and rating changes based on the given data and rating system.
     *
     * @returns {Object|null} Returns an object containing the sorted match results, or null if calculation fails.
     */
    calculate() {
        try {
            // get the rating system and check its validity
            const ratingSystem = this._getRatingSystem();
            if (!ratingSystem.isValid()) {
                return null;
            }

            // get deltas
            const deltas = {};
            Object.values(this._teams).forEach(playerTeam => {
                Object.values(playerTeam.players).forEach(player => {
                    /**
                     * Get player's rating delta = calculated rating difference between original and final rating, after the match
                     *
                     * @returns {number}
                     */
                    const getRatingDelta = () => {
                        let playerRatingDelta = 0;
                        // loop over all players again, this time they are opponents
                        Object.values(this._teams).forEach(opponentTeam => {
                            // if the player is on the same team, then skip the team
                            if (playerTeam.name === opponentTeam.name) {
                                return;
                            }
                            // calculate player rating points
                            Object.values(opponentTeam.players).forEach(opponent => {
                                playerRatingDelta += ratingSystem.calculate(player, playerTeam, opponent, opponentTeam);
                            });
                        });
                        return ratingSystem.adjustPlayerFinalRatingPoints(player, playerRatingDelta);
                    }
                    deltas[player.name] = getRatingDelta();
                });
            });

            // calculate team delta if rating average by team is enabled
            const isTeamMode = DUO_MODES.includes(this._lobbyType) || _3V3_MODES.includes(this._lobbyType) || _4V4_MODES.includes(this._lobbyType) || [INSTA_DUOS, INSTA_3V3, INSTA_4V4].includes(this._lobbyType);
            const ratingAverageByTeam = this._ratingSettings.ratingAverageByTeam;
            if (isTeamMode && ratingAverageByTeam) {
                Object.values(this._teams).forEach(playerTeam => {
                    let teamDelta = 0;
                    Object.values(playerTeam.players).forEach(player => {
                        teamDelta += deltas[player.name];
                    });
                    teamDelta /= playerTeam.players.length;

                    Object.values(playerTeam.players).forEach(player => {
                        deltas[player.name] = teamDelta;
                    });
                });
            }

            // loop over all players and try to set scores results
            const results = {};
            const minRating = this._ratingSettings.ratingMin;
            Object.values(this._teams).forEach(playerTeam => {
                Object.values(playerTeam.players).forEach(player => {
                    const delta = deltas[player.name];

                    // check final rating against minimal tier's lower bound
                    let finalRating = parseFloat(player.boardRating) + delta;
                    if (finalRating < minRating) {
                        finalRating = minRating;
                    }

                    // set player results
                    results[player.name] = {
                        name: player.name,
                        team: playerTeam.name,
                        originalRanking: null, // set later, after boards are recalculated (in scores_calculation.js)
                        finalRanking: null, // set later after boards are recalculated (in scores_calculation.js)
                        originalRating: parseFloat(player.boardRating),
                        delta: delta,
                        finalRating: finalRating,
                        teamPosition: playerTeam.position,
                        inTeamPosition: player.inTeamPosition,
                        position: player.position,
                        originalTier: MatchCalculator._getTierByRating(this._boardTiers, parseFloat(player.boardRating)).name,
                        finalTier: MatchCalculator._getTierByRating(this._boardTiers, finalRating).name,
                    };
                });
            });

            // Convert results into an array and sort players by their match positions
            const matchResults = Object.values(results).sort((a, b) => this._sortResultsByPosition(a, b, isTeamMode));

            // Return match results as an object
            return matchResults.reduce((accumulator, player) => ({...accumulator, [player.name]: player}), {});
        } catch (error) {
            return null;
        }
    }

    /**
     * Calculates match results based on the submitted match object from Lorenzi
     *
     * @returns {Object|null} Returns an object containing the sorted match results, or null if calculation fails.
     */
    calculateSubmittedMatch(match) {
        const isTeamMode = match.teams.length > 1;
        let submittedMatchResults = {};
        const lowestTier = MatchCalculator._getLowestTier(this._boardTiers);

        // loop through all teams and its players
        for (const team of match.teams) {
            for (const player of team.players) {

                // get player rating updates for a player
                // if not found, stop calculating
                const playerRatingUpdate = match.ratingUpdates.find(ratingUpdate => ratingUpdate.name === player.name) || null;
                if (null === playerRatingUpdate) {
                    return null;
                }

                // set player tiers
                let originalTier = "";
                for (const tier of this._boardTiers) {
                    if (parseFloat(playerRatingUpdate.ratingBefore) >= parseInt(tier.lowerBound)) {
                        originalTier = tier.name;
                    } else {
                        break;
                    }
                }
                if ("" === originalTier) {
                    originalTier = lowestTier.name;
                }
                let finalTier = "";
                for (const tier of this._boardTiers) {
                    if (parseFloat(playerRatingUpdate.ratingAfter) >= parseInt(tier.lowerBound)) {
                        finalTier = tier.name;
                    } else {
                        break;
                    }
                }
                if ("" === finalTier) {
                    finalTier = lowestTier.name;
                }

                let teamName = player.name;
                if (isTeamMode) {
                    if (team.hasOwnProperty("tag")) {
                        teamName = team.tag;
                    } else if (team.hasOwnProperty("name")) {
                        teamName = team.name;
                    }
                }

                // set player result
                submittedMatchResults[player.name] = {
                    name: player.name,
                    team: teamName,
                    originalRanking: !playerRatingUpdate.firstMatch && playerRatingUpdate.rankingBefore >= 0 ? parseInt(playerRatingUpdate.rankingBefore) + 1 : null,
                    finalRanking: playerRatingUpdate.rankingAfter >= 0 ? parseInt(playerRatingUpdate.rankingAfter) + 1 : null,
                    originalRating: parseFloat(playerRatingUpdate.ratingBefore),
                    delta: parseFloat(playerRatingUpdate.ratingAfter) - parseFloat(playerRatingUpdate.ratingBefore),
                    finalRating: parseFloat(playerRatingUpdate.ratingAfter),
                    teamPosition: team.position,
                    inTeamPosition: player.inTeamPosition,
                    position: player.position,
                    originalTier: originalTier,
                    finalTier: finalTier,
                };
            }
        }

        // Convert predictions into an array and sort players by their match positions
        const matchResults = Object.values(submittedMatchResults).sort((a, b) => this._sortResultsByPosition(a, b, isTeamMode));

        // Convert back to an object
        submittedMatchResults = matchResults.reduce((accumulator, player) => ({...accumulator, [player.name]: player}), {});

        // return match results
        if (0 === Object.keys(submittedMatchResults).length) {
            return null;
        }

        return submittedMatchResults;
    }

    /**
     * Calculate players' shifted board ratings by a match results and current board information
     *
     * @param {Object} matchResults
     * @param {Object} boardPlayers
     */
    static calculateBoardRatings(matchResults, boardPlayers) {
        // set the latest board ratings for match players on the board
        const boardPlayersMap = {};
        for (let [i, boardPlayer] of boardPlayers.entries()) {
            if (matchResults.hasOwnProperty(boardPlayer.name)) {
                boardPlayers.rating = parseFloat(matchResults[boardPlayer.name].finalRating);
            }
            boardPlayer.rating = parseFloat(boardPlayer.rating);
            boardPlayersMap[boardPlayer.name] = boardPlayer;
        }

        // set new board players for all match players that are not on the board yet
        for (let [name, player] of Object.entries(matchResults)) {
            if (!boardPlayersMap.hasOwnProperty(player.name)) {
                boardPlayers.push({
                    name: player.name,
                    ranking: null,
                    rating: parseFloat(matchResults[name].finalRating),
                });
            }
        }
    }

    /**
     * Calculate players' shifted board rankings by a match results and current board information
     *
     * @param {Object} matchResults
     * @param {Object} boardPlayers
     * @param {Array|null} newPlayers Names of the new players
     */
    static calculateBoardRankings(matchResults, boardPlayers, newPlayers = null) {
        // create a board players map object
        const boardPlayersMap = {};
        for (let [i, player] of boardPlayers.entries()) {
            boardPlayersMap[player.name] = player;
        }

        // set null ranking values for all match players
        for (let [name, player] of Object.entries(matchResults)) {
            matchResults[name].originalRanking = null;
            matchResults[name].finalRanking = null;
        }

        // if match players are on the board, set their original rankings
        // and also update board ratings
        for (let [name, player] of Object.entries(matchResults)) {
            if (boardPlayersMap.hasOwnProperty(name) && boardPlayersMap[name].hasOwnProperty("ranking")) {
                matchResults[name].originalRanking = parseFloat(boardPlayersMap[name].ranking);
            }
            if (!boardPlayersMap.hasOwnProperty(name)) {
                boardPlayersMap[name] = {
                    name: name,
                    ranking: null,
                    rating: null,
                };
                newPlayers.push(name);
            }
            boardPlayersMap[name].rating = parseFloat(matchResults[name].finalRating);
        }

        // sort board players by rating DESC
        const sortedBoardPlayers = Object.values(boardPlayersMap).sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));

        // set match players' ranking
        for (let [name, player] of Object.entries(matchResults)) {
            // set final rankings
            const finalRanking = sortedBoardPlayers.findIndex(obj => obj.name === player.name);
            if (finalRanking >= 0) {
                matchResults[name].finalRanking = finalRanking + 1;
            }

            // shift original rankings for existing players by new players added to the board
            if (null === newPlayers || newPlayers.includes(name)) {
                continue;
            }

            for (let [i, newPlayerName] of newPlayers.entries()) {
                if (matchResults[newPlayerName].originalRating > player.originalRating) {
                    matchResults[name].originalRanking = player.originalRanking + 1;
                }
            }
        }

        // create new board players array with updated rankings and then rewrite the original board players
        const newBoardPlayers = [];
        for (let [i, player] of sortedBoardPlayers.entries()) {
            player.ranking = i + 1;
            newBoardPlayers.push(player);
        }
        boardPlayers = newBoardPlayers;
    }

    /**
     * Get the rating system
     *
     * @returns {RatingSystemMmr|RatingSystemElo|null}
     * @private
     */
    _getRatingSystem() {
        let ratingSystem = null;
        switch (this._ratingSettings.scheme) {
            case RATING_SCHEME_ELO:
                ratingSystem = new RatingSystemElo(this._teams, this._lobbyType, this._ratingSettings);
                break;
            case RATING_SCHEME_MMR:
                ratingSystem = new RatingSystemMmr(this._teams, this._lobbyType, this._ratingSettings);
                break;
            default:
                return null;
        }
        return ratingSystem;
    }

    /**
     * Return tier text by rating points.
     *
     * @param {Array} boardTiers
     * @param {Number} rating
     *
     * @returns {Object}
     * @private
     */
    static _getTierByRating(boardTiers, rating) {
        const tiers = JSON.parse(JSON.stringify(boardTiers));
        let tier = "";
        for (const boardTier of tiers) {
            if (rating >= boardTier.lowerBound) {
                tier = boardTier;
            } else {
                break;
            }
        }

        if (0 === Object.keys(tier).length) {
            tier = MatchCalculator._getLowestTier(tiers);
        }

        return tier;
    }

    /**
     * Get tier with the lowest lower bound
     *
     * @param {Array} boardTiers
     *
     * @returns {Object}
     * @private
     */
    static _getLowestTier(boardTiers) {
        let minLowerBound = Infinity;
        const tiers = JSON.parse(JSON.stringify(boardTiers));
        let tier = null;
        for (const boardTier of tiers) {
            if (boardTier.lowerBound < minLowerBound) {
                minLowerBound = boardTier.lowerBound;
                tier = boardTier;
            }
        }
        return tier;
    }

    /**
     * Get minimal available rating
     *
     * @param {Array} boardTiers
     *
     * @returns {number}
     * @private
     */
    static _getMinRating(boardTiers) {
        return parseFloat(MatchCalculator._getLowestTier(boardTiers).lowerBound);
    }

    /**
     * Sort method for results
     *
     * @param {Object} a
     * @param {Object} b
     * @param {boolean} isTeamMode
     * @returns {number}
     * @private
     */
    _sortResultsByPosition(a, b, isTeamMode) {

        if (isTeamMode) {
            // If isTeamMode is true, sort by teamPosition and within the same team by position
            if (a.teamPosition !== b.teamPosition) {
                return a.teamPosition - b.teamPosition;
            }

            // If teams have the same teamPosition, sort within the same team by position
            if (a.team === b.team) {
                return a.position - b.position;
            }

            // If teams have the same teamPosition but are different teams, maintain the current order
            return 0;
        }

        // If isTeamMode is false or teams have the same teamPosition but are different teams, sort as usual
        return a.teamPosition - b.teamPosition || a.position - b.position;
    }
}

module.exports = MatchCalculator;
