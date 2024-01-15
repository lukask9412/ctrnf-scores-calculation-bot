const {
    RACE_ITEMS_FFA,
    RACE_ITEMS_DUOS,
    RACE_ITEMS_3V3,
    RACE_ITEMS_4V4,
    BATTLE_1V1,
    BATTLE_FFA,
    BATTLE_DUOS,
    BATTLE_3V3,
    BATTLE_4V4,
    INSTA_DUOS,
    INSTA_3V3,
    INSTA_4V4,
} = require('../../db/models/lobby');

const AbstractRatingSystem = require('./abstract_rating_system');

/**
 * A rating system that calculates the rating change for players or teams based on the MMR system.
 * Inherits from the AbstractRatingSystem class.
 */
class RatingSystemMmr extends AbstractRatingSystem {

    /**
     * Baseline gain / loss for 2 players / teams of equal MMR
     * 
     * @type {(null | number)}
     * @name _baseline
     * @private
     */
    _baseline = null;

    /**
     * Determines how harsh the equation is for bigger MMR differentials
     * 
     * @type {(null | number)}
     * @name _scalingFactor
     * @private
     */
    _scalingFactor = null;

    /**
     * @see AbstractRatingSystem.constructor
     * Sets rating system's algorithm variables.
     * 
     * @constructor
     */
    constructor(teams, lobbyType, ratingSettings) {
        super(teams, lobbyType, ratingSettings);
        this._setAlgorithmVariables();
    }

    /**
     * @see AbstractRatingSystem.calculate
     */
    calculate(player, playerTeam, opponent, opponentTeam) {
        // Set match points for the players
        let playerPoints = 0, opponentPoints = 0;
        if (this._isTeamMode) {
            playerPoints = playerTeam.score - playerTeam.penalty;
            opponentPoints = opponentTeam.score - opponentTeam.penalty;
        } else {
            playerPoints = player.score - player.penalty;
            opponentPoints = opponent.score - opponent.penalty;
        }

        // Find out player x opponent match status
        const isTie = playerPoints === opponentPoints;
        const isWinner = playerPoints > opponentPoints;
        const isPlayerExpectedToWin = player.boardRating < opponent.boardRating;

        // calculate rating points by the right algorithm
        if (isTie) {
            return (isPlayerExpectedToWin ? 1 : -1) * this._calculateByTieAlgorithm(player, opponent);
        } else {
            return (isWinner ? 1 : -1) * this._calculateByWinAlgorithm(isWinner ? player : opponent, isWinner ? opponent : player);
        }
    }

    /**
     * @see AbstractRatingSystem.isValid
     */
    isValid() {
        return super.isValid() && null !== this._baseline && null !== this._scalingFactor;
    }

    /**
     * @see AbstractRatingSystem.adjustPlayerFinalRatingPoints
     */
    adjustPlayerFinalRatingPoints(player, ratingPoints) {
        return ratingPoints / super._getNbOpponents(player);
    }

    /**
     * Calculates the rating change using the win algorithm.
     * 
     * @param {Object} winner - The winning player or team.
     * @param {Object} loser - The losing player or team.
     * @returns {number} Returns the calculated rating change.
     * @private
     */
    _calculateByWinAlgorithm(winner, loser) {
        return 1 + (this._baseline * Math.pow(1 + Math.max(-9997, loser.boardRating - winner.boardRating) / 9998, this._scalingFactor));
    }

    /**
     * Calculates the rating change using the tie algorithm.
     * @param {Object} player - The first player or team.
     * @param {Object} opponent - The second player or team.
     * @returns {number} Returns the calculated rating change.
     * @private
     */
    _calculateByTieAlgorithm(player, opponent) {
        return 1.5 * this._scalingFactor * (this._baseline + 1) * Math.pow(Math.pow(Math.pow(Math.max(-9997, player.boardRating - opponent.boardRating) / 9998, 2), 1 / 3), 2);
    }

    /**
     * @see AbstractRatingSystem._setAlgorithmVariables
     */
    _setAlgorithmVariables() {
        switch (this._lobbyType) {
            case RACE_ITEMS_FFA:
            case BATTLE_FFA:
            case BATTLE_1V1:
                this._baseline = this._ratingSettings.baselines[0];
                this._scalingFactor = this._ratingSettings.scalingFactors[0];
                break;
            case RACE_ITEMS_DUOS:
            case INSTA_DUOS:
            case BATTLE_DUOS:
                this._baseline = this._ratingSettings.baselines[1];
                this._scalingFactor = this._ratingSettings.scalingFactors[1];
                break;
            case RACE_ITEMS_3V3:
            case INSTA_3V3:
            case BATTLE_3V3:
                this._baseline = this._ratingSettings.baselines[2];
                this._scalingFactor = this._ratingSettings.scalingFactors[2];
                break;
            case RACE_ITEMS_4V4:
            case INSTA_4V4:
            case BATTLE_4V4:
                this._baseline = this._ratingSettings.baselines[3];
                this._scalingFactor = this._ratingSettings.scalingFactors[3];
                break;
        }
    }
}

module.exports = RatingSystemMmr;
