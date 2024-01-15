const {
    RACE_ITEMLESS_1V1,
    RACE_ITEMLESS_FFA,
    RACE_ITEMLESS_DUOS,
    RACE_ITEMLESS_3V3,
    RACE_ITEMLESS_4V4,
} = require('../../db/models/lobby');

const AbstractRatingSystem = require('./abstract_rating_system');

/**
 * A rating system that calculates the rating change for players or teams based on the Elo rating system.
 * Inherits from the AbstractRatingSystem class.
 */
class RatingSystemElo extends AbstractRatingSystem {

    /**
     * Determines how harsh the equation is for bigger MMR differentials
     * 
     * @type {(null|number)}
     * @name _scalingFactor
     * @private
     */
    _scalingFactor = null;

    /** 
     * K-Factor: The maximum possible adjustment per game
     * 
     * @type {(null|number)}
     * @name _k
     * @private
     */
    _k = null;

    /**
     * The actual score of Player A (score that hte player A is added / subtracted to their ELO points
     *
     * @type {(null|number)}
     * @name _sa
     * @private
     */
    _sa = null;

    /**
     * The expected score of Player A (score that the player A is added / subtracted to their ELO points
     *
     * @type {(null|number)}
     * @name _ea
     * @private
     */
    _ea = null;

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

        // set algorithm variables
        this._k = this._scalingFactor / super._getNbOpponents(player);
        this._sa = isWinner ? 1 : (isTie ? 0.5 : 0);
        this._ea = 1 / (1 + Math.pow(10, (opponent.boardRating - player.boardRating) / 400));

        // calculate rating points
        return this._k * (this._sa - this._ea);
    }

    /**
     * @see AbstractRatingSystem.isValid
     */
    isValid() {
        return super.isValid() && null !== this._scalingFactor;
    }

    /**
     * @see AbstractRatingSystem._setAlgorithmVariables
     */
    _setAlgorithmVariables() {
        switch (this._lobbyType) {
            case RACE_ITEMLESS_FFA:
            case RACE_ITEMLESS_1V1:
                this._scalingFactor = this._ratingSettings.scalingFactors[0];
                break;
            case RACE_ITEMLESS_DUOS:
                this._scalingFactor = this._ratingSettings.scalingFactors[1];
                break;
            case RACE_ITEMLESS_3V3:
                this._scalingFactor = this._ratingSettings.scalingFactors[2];
                break;
            case RACE_ITEMLESS_4V4:
                this._scalingFactor = this._ratingSettings.scalingFactors[3];
                break;
        }
    }
}

module.exports = RatingSystemElo;
