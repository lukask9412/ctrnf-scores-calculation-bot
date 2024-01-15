const CanvasRenderer = require('./canvas_renderer');
const Dimensions = require('./dimensions');

/**
 * A wrapper class for generating table image.
 */
class Image {
    constructor() {
        this._canvasRenderer = new CanvasRenderer();
    }

    /**
     * Generates an image of the match results as a buffer
     *
     * @param {Object} lobbyResults
     * @param {Object} table
     * @param {Object} board
     * @returns {Buffer|null}
     */
    async draw(lobbyResults, table = null, board = null) {
        try {
            // create deep copies of the objects
            let _lobbyResults = JSON.parse(JSON.stringify(lobbyResults));
            const _table = JSON.parse(JSON.stringify(table));
            const _board = JSON.parse(JSON.stringify(board));

            // update lobby results object, so it has all needed data to draw the table
            _lobbyResults = this._updateLobbyResults(_lobbyResults, _board);

            // initialize canvas renderer data
            this._canvasRenderer.dimensions = new Dimensions().calculate(_lobbyResults, _table, _board);
            this._canvasRenderer.lobbyResults = _lobbyResults;
            this._canvasRenderer.table = _table;
            this._canvasRenderer.board = _board;

            // draw and return the rendered image
            return await this._canvasRenderer.draw();
        } catch (error) {
            return null;
        }
    }

    /**
     * Adds additional data to the lobby results object, that are needed later while calculating positions and drawing
     *
     * @param {Object} lobbyResults
     * @param {Object} board
     * @returns {Object}
     * @private
     */
    _updateLobbyResults(lobbyResults, board) {
        // update tiers
        // Build a mapping of tier names to their objects
        const tierMap = {};
        for (const tier of board.tiers) {
            tierMap[tier.name] = tier;
        }

        for (const playerKey in lobbyResults) {
            const player = lobbyResults[playerKey];
            const originalTier = tierMap[player.originalTier];
            const finalTier = tierMap[player.finalTier];

            let tier = null;

            if (originalTier.name !== finalTier.name) {
                tier = {...finalTier, text: finalTier.name, shift: (finalTier.lowerBound > originalTier.lowerBound ? "▲" : "▼")};
            } else {
                tier = {...finalTier, text: finalTier.name, shift: null};
            }

            lobbyResults[playerKey]["tier"] = tier;
        }

        // Update deltas by ranking differences, fixes lorenzi rounding
        for (const playerKey in lobbyResults) {
            const player = lobbyResults[playerKey];
            lobbyResults[playerKey]["delta"] = Math.floor(player.finalRating) - Math.floor(player.originalRating);
        }

        // return updated lobby results
        return lobbyResults;
    }
}

module.exports = Image;
