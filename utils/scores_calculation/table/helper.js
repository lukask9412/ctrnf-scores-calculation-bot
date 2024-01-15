const {loadImage} = require("canvas");
const path = require('path');

class Helper {
    /**
     * Get formatted current date
     *
     * @returns {string}
     */
    static getDate() {
        const today = new Date();

        const day = today.getDate();
        const month = new Intl.DateTimeFormat('en-US', {month: 'short'}).format(today);
        const year = today.getFullYear();

        return `${day} ${month} ${year}`;
    }

    /**
     * Get maximum number of scores in a lobby (= number of tracks)
     *
     * @param {Object} teams
     * @returns {number}
     */
    static getMaxNbScores(teams) {
        return Math.max(...teams.flatMap(team => team.players.map(player => player.scores.length)));
    }

    /**
     * Get total points in the lobby
     *
     * @param {Object} teams
     * @returns {number}
     */
    static getTotalMatchPoints(teams) {
        return [...teams.values()].reduce((total, team) => total + (team.score - team.penalty), 0);
    }

    /**
     * Shorten long names
     *
     * @param name
     * @param maxLength
     * @returns {string|*}
     */
    static getName(name, maxLength = 24) {
        return Array.from(name).length > maxLength ? [...name].slice(0, maxLength - 3).join('') + '...' : name;
    }

    /**
     * Try to get rank image
     *
     * @param {number} rank
     * @param {number} nbPlastPlace
     * @param {boolean} useLastIcon
     * @returns {Promise<Image>|string} Image on success and string representation of the rank on error
     */
    static async getRank(rank, nbPlastPlace, useLastIcon = true) {
        try {
            if (useLastIcon && nbPlastPlace === parseInt(rank)) {
                return await loadImage(path.join(__dirname, '..', 'assets', 'images', 'ranks', `turtle.png`));
            }
            return await loadImage(path.join(__dirname, '..', 'assets', 'images', 'ranks', `${rank}.png`));
        } catch (error) {
            switch (rank) {
                case 1:
                    return `${rank}st`;
                case 2:
                    return `${rank}nd`;
                case 3:
                    return `${rank}rd`;
                default:
                    return `${rank}th`;
            }
        }
    }

    /**
     * Get the last place number from the lobby results
     *
     * @param lobbyResults
     * @returns {number}
     */
    static getLastPlaceNumber(lobbyResults) {
        let lowestPosition = Infinity;
        let highestPosition = -Infinity;

        for (let [name, player] of Object.entries(lobbyResults)) {
            if (player.position < lowestPosition) {
                lowestPosition = player.position;
            }
            if (player.position > highestPosition) {
                highestPosition = player.position;
            }
        }

        let nbLastPlaces = 0;
        for (let [name, player] of Object.entries(lobbyResults)) {
            if (player.position === highestPosition) {
                nbLastPlaces++;
            }
        }

        if (lowestPosition < highestPosition && highestPosition > 3 && 1 === nbLastPlaces) {
            return highestPosition;
        }
        return Infinity;
    }

    /**
     * Get a flag image
     *
     * @param flag
     * @returns {Promise<Image>}
     */
    static async getFlag(flag) {
        try {
            return await loadImage(path.join(__dirname, '..', 'assets', 'images', 'flags', `${flag}.png`));
        } catch (error) {
            return await loadImage(path.join(__dirname, '..', 'assets', 'images', 'flags', `un.png`));
        }
    }

    /**
     * Get a shift image
     *
     * @param {string} shift
     * @param {string} color
     * @returns {Promise<Image>}
     */
    static async getShiftImage(shift, color = null) {
        try {
            if ("▼" === shift) {
                if (color) {
                    return await loadImage(path.join(__dirname, '..', 'assets', 'images', 'results', `shift_negative_${color}.png`));
                }
                return await loadImage(path.join(__dirname, '..', 'assets', 'images', 'results', `shift_negative.png`));
            } else if ("▲" === shift) {
                if (color) {
                    return await loadImage(path.join(__dirname, '..', 'assets', 'images', 'results', `shift_positive_${color}.png`));
                }
                return await loadImage(path.join(__dirname, '..', 'assets', 'images', 'results', `shift_positive.png`));
            } else {
                return shift;
            }
        } catch (error) {
            return shift;
        }
    }

    /**
     * Check if rankings are available in the lobby results
     *
     * @param lobbyResults
     * @returns {boolean}
     */
    static areRankingsAvailable(lobbyResults) {
        for (let [name, player] of Object.entries(lobbyResults)) {
            if (player.hasOwnProperty("finalRanking")) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get a ranking shift symbol
     *
     * @param player
     * @returns {string}
     */
    static getRankingShiftSymbol(player) {
        if (
            player.hasOwnProperty("originalRanking") &&
            player.hasOwnProperty("finalRanking") &&
            player.originalRanking !== null &&
            player.finalRanking !== null
        ) {
            if (player.finalRanking > player.originalRanking) {
                return "▼";
            } else if (player.finalRanking < player.originalRanking) {
                return "▲";
            } else {
                return "–";
            }
        } else {
            return "–";
        }
    }

    /**
     * Check if there was a penalty in the lobby
     * @param lobbyResults
     * @returns {*}
     */
    static hasPenalty(lobbyResults) {
        return lobbyResults.some(team => team.players.some(player => 0 !== player.penalty));
    }
}

module.exports = Helper;
