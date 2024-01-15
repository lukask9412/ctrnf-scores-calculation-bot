const {
    DUO_MODES,
    _3V3_MODES,
    _4V4_MODES,
    INSTA_DUOS,
    INSTA_3V3,
    INSTA_4V4,
} = require('../../db/models/lobby');

/**
 * An abstract class for defining a rating system and its calculation methods.
 */
class AbstractRatingSystem {

    /**
     * @constructor
     * @param {Array} teams - Teams and players in the match.
     * @param {string} lobbyType - The type of the lobby/match for which the rating system is being defined.
     * @param {Object} ratingSettings - An object containing the rating system's configuration settings.
     *   - scheme {string} - The name of the rating scheme used by the system.
     *   - [Additional keys] - Depending on the specific rating system, there are values of algorithm variables needed to calculate the results.
     * @property {Array} _teams
     * @property {string} _lobbyType
     * @property {Object} _ratingSettings
     * @property {boolean} _isTeamMode - Indicates whether the match is played in a team-based mode.
     * @property {number} _nbTeams - The total number of teams in the match.
     * @property {number} _nbPlayers - The total number of players in the match.
     */
    constructor(teams, lobbyType, ratingSettings) {
        this._teams = teams;
        this._lobbyType = lobbyType;
        this._ratingSettings = ratingSettings;
        this._isTeamMode = DUO_MODES.includes(this._lobbyType) || _3V3_MODES.includes(this._lobbyType) || _4V4_MODES.includes(this._lobbyType) || [INSTA_DUOS, INSTA_3V3, INSTA_4V4].includes(this._lobbyType);
        this._nbTeams = this._teams.length;
        this._nbPlayers = this._getNbPlayers();
    }

    /**
     * Calculates the rating change for a player based on the rating system's algorithm.
     * 
     * @param {Object} player - The player for whom the rating change is calculated.
     * @param {Object} playerTeam - The player's team.
     * @param {Object} opponent - The opponent player.
     * @param {Object} opponentTeam - The opponent's team.
     * @returns {number|null} Returns the calculated rating change for the player, or null if not implemented.
     */
    calculate(player, playerTeam, opponent, opponentTeam) {
        return null;
    }

    /**
     * Checks if the rating system is valid for calculation.
     *
     * @returns {boolean} Returns true if is valid, false otherwise.
     */
    isValid() {
        // validate that there are opponents for each player in the match
        for (let [key, team] of this._teams.entries()) {
            for (let [key2, player] of team.players.entries()) {
                if (0 === this._getNbOpponents(player)) {
                    return false;
                }
            }
        }

        // validate that there are at least two players
        return this._nbPlayers >= 2;
    }

    /**
     * Adjusts the player's final rating points.
     * 
     * @param {Object} player - The player object
     * @param {number} ratingPoints - The rating points to adjust.
     * @returns {number} Returns the adjusted rating points (unchanged by default).
     */
    adjustPlayerFinalRatingPoints(player, ratingPoints) {
        return ratingPoints;
    }

    /**
     * Sets algorithm-specific variables.
     * @protected
     */
    _setAlgorithmVariables() {
        return;
    }

    /**
     * Calculates the total number of players in a match.
     *
     * @returns {number} Returns the total number of players.
     * @protected
     */
    _getNbPlayers() {
        let nbPlayers = 0;
        Object.values(this._teams).forEach(team => {
            Object.values(team.players).forEach(player => {
                nbPlayers++;
            });
        });
        return nbPlayers;
    }

    /**
     * Calculates the total number of opponents of a player.
     *
     * @param {Object} player
     * @returns {number} Returns the total number of opponents.
     * @protected
     */
    _getNbOpponents(player) {
        let nbOpponents = 0;

        if (this._isTeamMode) {
            let playerTeamKey = null;
            teamsLoop: for (const [key, team] of Object.entries(this._teams)) {
                for (const teamPlayer of Object.values(team.players)) {
                    if (teamPlayer.name === player.name) {
                        playerTeamKey = key;
                        break teamsLoop;
                    }
                }
            }
            if (null === playerTeamKey) {
                throw new Error("Could not get player team");
            }
            for (const [key, team] of Object.entries(this._teams)) {
                if (key === playerTeamKey) {
                    continue;
                }
                nbOpponents += team.players.length;
            }
        } else {
            nbOpponents = this._getNbPlayers() - 1;
        }
        
        return nbOpponents;
    }
}

module.exports = AbstractRatingSystem;
