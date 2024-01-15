const MeasurementCanvas = require("./measurement_canvas");
const Helper = require("./helper");
const path = require('path');

/**
 * Sets all dimensions (widths, heights, margins / offsets, paddings, font sizes) for the CanvasRenderer class
 */
class Dimensions {
    static FONT = {
        "Roboto": {
            size: 28,
            weight: {
                "regular": 400,
                "medium": 500,
                "bold": 600,
                "black": 900,
                "extra": 1000
            },
            family: "Roboto",
            path: {
                "regular": path.join(__dirname, '..', 'assets', 'fonts', 'Roboto-Regular.ttf'),
                "medium": path.join(__dirname, '..', 'assets', 'fonts', 'Roboto-Medium.ttf'),
                "bold": path.join(__dirname, '..', 'assets', 'fonts', 'Roboto-Bold.ttf'),
                "black": path.join(__dirname, '..', 'assets', 'fonts', 'Roboto-Black.ttf'),
                "extra": path.join(__dirname, '..', 'assets', 'fonts', 'RobotoSlab-Black.ttf'),
            },
        },
        "OpenSans": {
            size: 28,
            weight: {
                "regular": 400,
                "medium": 500,
                "bold": 600,
                "extraBold": 700,
                "black": 800,
            },
            family: "OpenSans",
            path: {
                "regular": path.join(__dirname, '..', 'assets', 'fonts', 'OpenSans-Regular.ttf'),
                "medium": path.join(__dirname, '..', 'assets', 'fonts', 'OpenSans-Medium.ttf'),
                "semiBold": path.join(__dirname, '..', 'assets', 'fonts', 'OpenSans-SemiBold.ttf'),
                "bold": path.join(__dirname, '..', 'assets', 'fonts', 'OpenSans-Bold.ttf'),
                "black": path.join(__dirname, '..', 'assets', 'fonts', 'OpenSans-ExtraBold.ttf'),
            },
        },
    }

    get dimensions() {
        return this._dimensions;
    }

    constructor() {
        const font = Dimensions.FONT["OpenSans"];

        this._canvas = new MeasurementCanvas(font).canvas;
        this._dimensions = {};
    }

    /**
     * Calculate all needed dimensions for the table image.
     * @param {Object} lobbyResults
     * @param {Object} table
     * @param {Object} board
     * @returns {Object}
     */
    calculate(lobbyResults, table, board) {
        // initialize canvas dimensions
        const canvasDimensions = {
            width: 0,
            height: 0,
            margin: {
                x: 90,
                y: 60,
            }
        };

        // calculate scores dimensions
        const scoresDimension = this._getScoresDimensions(lobbyResults, table, board, {
            canvas: canvasDimensions,
        });

        // calculate results dimensions
        const resultsDimensions = this._getResultsDimensions(lobbyResults, table, board, {
            canvas: canvasDimensions,
            scores: scoresDimension,
        });

        // calculate header dimensions
        const headerDimensions = this._getHeaderDimensions(lobbyResults, table, board, {
            canvas: canvasDimensions,
            scores: scoresDimension,
            results: resultsDimensions,
        });

        // save the calculated dimensions
        this._dimensions.font = Dimensions.FONT["OpenSans"];
        this._dimensions.header = headerDimensions;
        this._dimensions.scores = scoresDimension;
        this._dimensions.results = resultsDimensions;

        // update and save canvas dimensions
        canvasDimensions.width = Math.ceil(Math.max(this._dimensions.scores.width.total, this._dimensions.results.width.total));
        canvasDimensions.height = Math.ceil(this._dimensions.header["height"] + this._dimensions.scores.height.total + this._dimensions.results.height.total);
        this._dimensions.canvas = canvasDimensions;

        return this._dimensions;
    }

    _getHeaderDimensions(lobbyResults, table, board, data) {
        return {
            font: 32,
            width: data.results.width.table,
            height: 68,
            text: {
                margin: 30
            },
            margin: {
                x: 0,
                y: 0,
            }
        };
    }

    _getScoresDimensions(lobbyResults, table, board, data) {
        // create an object of all elements in the teams tables (player rows)
        const playerTexts = {
            name: [],
            scores: [],
            totalScores: [],
            penalty: [],
        };

        // save all texts of those elements
        for (let [i, team] of table.teams.entries()) {
            for (let [j, player] of team.players.entries()) {
                playerTexts.name.push(Helper.getName(player.name));
                playerTexts.scores = player.scores.map(score => "55");
                playerTexts.totalScores.push(player.score.toString());
                playerTexts.penalty.push(player.penalty > 0 ? `-${player.penalty}` : (player.penalty < 0 ? `+${Math.abs(player.penalty)}` : ""));
            }
        }

        // create an object of all other texts needed for scores table
        const otherTexts = {
            teamName: [],
            teamNameDescription: [],
            teamRatingPoints: [],
            teamRatingPointDifferences: [],
        };

        // save all texts of those elements
        let hasTeamDescription = false;
        for (let [i, team] of table.teams.entries()) {
            // extract team name description from the team name
            let teamName = team.name.split("-");
            if (table.isTeamMode && teamName.length > 1 && teamName[1].trim().length > 0) {
                teamName = [teamName[0].trim(), teamName[1].trim()];
                hasTeamDescription = true;
            }
            otherTexts.teamName.push(Helper.getName(teamName[0], 10));
            otherTexts.teamNameDescription.push(teamName.length > 1 ? Helper.getName(teamName[1]) : "");
            otherTexts.teamRatingPoints.push((team.score - team.penalty).toString());
            otherTexts.teamRatingPointDifferences.push((0 === i ? "" : "±" + ((table.teams[i - 1].score - table.teams[i - 1].penalty) - (team.score - team.penalty))).toString());
        }

        // other dimensions used later (paddings, margin, heights, fonts)
        // prepare font sizes and weights
        //
        // left column
        const leftTextsBigSize = 60;
        const leftTextsBigWidth = Dimensions.FONT["OpenSans"].weight["black"];
        const leftTextBigHeight = this._measureText("O", {size: leftTextsBigSize, weight: leftTextsBigWidth}).height;
        const lobbyType = table.lobbyType.split("_")[1].toUpperCase();
        const lobbyTypeWidth = this._measureText(lobbyType, {size: leftTextsBigSize, weight: leftTextsBigWidth}).width;
        const lobbyNumber = `#${table.lobbyNumber}`;
        const lobbyNumberWidth = this._measureText(lobbyNumber, {size: leftTextsBigSize, weight: leftTextsBigWidth}).width;
        const teamNameMargin = [22, 0];
        const teamPositionWidth = leftTextBigHeight * 1.2;

        // center column
        const playerPositionSize = this._measureText(Object.keys(lobbyResults).length + "th", {weight: Dimensions.FONT["OpenSans"].weight["bold"]}).width;
        const tableRowHeight = 46;
        const paddingTableElement = 3;
        const marginPlayerElement = [paddingTableElement, 0];

        // right column
        const teamRatingPointsDifferencesTextSize = 36;
        const rightTextsSize = 76;
        const ratingPointsWeight = Dimensions.FONT["OpenSans"].weight["black"];
        const teamRatingPointsHeight = this._measureText("O", {size: rightTextsSize, weight: ratingPointsWeight}).height
        const ratingPointsWidth = table.isTeamMode ? this._getTextMaxWidths({teamRatingPoints: otherTexts.teamRatingPoints}, {
            size: rightTextsSize,
            weight: ratingPointsWeight,
        }).teamRatingPoints : this._measureText(Helper.getTotalMatchPoints(table.teams).toString(), {size: rightTextsSize, weight: ratingPointsWeight}).width;

        // calculate team heights (basically the whole height of the scores) and widths
        let totalHeight = 0;
        const teamHeights = [];
        const teamNamesWidths = [];
        const leftTeamsWidths = [];
        if (table.isTeamMode) {
            for (let [i, team] of table.teams.entries()) {
                let tableTeamHeight = data.canvas.margin.y * 2;
                for (let [j, player] of team.players.entries()) {
                    tableTeamHeight += tableRowHeight + paddingTableElement;
                }

                const playersPenalty = [...team.players.values()].reduce((totalPenalty, player) => totalPenalty + player.penalty, 0);
                const teamPenalty = team.penalty - playersPenalty;
                if (0 !== teamPenalty) {
                    tableTeamHeight += tableRowHeight + paddingTableElement;
                }

                tableTeamHeight -= paddingTableElement
                tableTeamHeight = Math.max(tableTeamHeight, leftTextBigHeight, teamRatingPointsHeight);
                teamHeights.push(tableTeamHeight);
                totalHeight += tableTeamHeight;

                // measure team width
                let teamName = team.name.split("-");
                if (table.isTeamMode && teamName.length > 1 && teamName[1].trim().length > 0) {
                    teamName = [teamName[0].trim(), teamName[1].trim()];
                    hasTeamDescription = true;
                }
                teamNamesWidths.push(Math.max(
                    this._measureText(Helper.getName(teamName[0], 10), {size: leftTextsBigSize, weight: Dimensions.FONT["OpenSans"].weight["black"]}).width,
                    this._measureText(Helper.getName(teamName.length > 1 ? Helper.getName(teamName[1]) : ""), {weight: Dimensions.FONT["OpenSans"].weight["bold"]}).width,
                ));

                leftTeamsWidths.push(teamPositionWidth + teamNameMargin[0] + teamNamesWidths[i]);
            }
        } else {
            totalHeight += data.canvas.margin.y * 2;
            for (let [i, team] of table.teams.entries()) {
                for (let [j, player] of team.players.entries()) {
                    totalHeight += tableRowHeight + paddingTableElement;
                }
            }
            totalHeight -= paddingTableElement;
            teamHeights.push(totalHeight);
        }

        // get max team name width
        let maxTeamNameWidth = Math.max(
            this._getTextMaxWidths({teamName: otherTexts.teamName}, {size: leftTextsBigSize, weight: Dimensions.FONT["OpenSans"].weight["black"]}).teamName,
            this._getTextMaxWidths({teamNameDescription: otherTexts.teamNameDescription}, {weight: Dimensions.FONT["OpenSans"].weight["bold"]}).teamNameDescription
        );
        let teamNameHeights = [];
        for (let [i, team] of table.teams.entries()) {
            if (hasTeamDescription) {
                let teamName = team.name.split("-");
                if (teamName.length > 1 && teamName[1].trim().length > 0) {
                    teamNameHeights.push(leftTextBigHeight + this._measureText("O", {size: Dimensions.FONT["OpenSans"].size, weight: Dimensions.FONT["OpenSans"].weight["bold"]}).height);
                } else {
                    teamNameHeights.push(leftTextBigHeight);
                }
            } else {
                teamNameHeights.push(leftTextBigHeight);
            }
        }

        // side elements width calculation
        const leftTextsFullWidth = table.isTeamMode ? teamPositionWidth + teamNameMargin[0] + maxTeamNameWidth : Math.max(lobbyTypeWidth, lobbyNumberWidth);
        const sideElementsWidth = Math.max(leftTextsFullWidth, ratingPointsWidth);
        if (table.isTeamMode) {
            maxTeamNameWidth = sideElementsWidth - teamPositionWidth - teamNameMargin[0];
        }
        const hasPenalty = Helper.hasPenalty(table.teams);
        const teamRatingPointsDifferencesWidths = [];
        const teamRatingPointsDifferencesMargins = [];
        for (let [i, value] of otherTexts.teamRatingPointDifferences.entries()) {
            teamRatingPointsDifferencesWidths.push(this._measureText(value, {size: teamRatingPointsDifferencesTextSize, weight: Dimensions.FONT["OpenSans"].weight["bold"]}).width);
            teamRatingPointsDifferencesMargins.push([data.canvas.margin.x + (ratingPointsWidth / 2) - (teamRatingPointsDifferencesWidths[i] / 2) - (hasPenalty ? 10 : 0), 0]);
        }

        // initialize dimensions array
        const dimensions = {
            font: {
                match_type_number: leftTextsBigSize,
                team_name: leftTextsBigSize,
                team_position: 32,
                rating_points: rightTextsSize,
                team_rating_points_differences: teamRatingPointsDifferencesTextSize,
                rating_points_weight: ratingPointsWeight
            },
            width: {
                // left
                match_type_number: sideElementsWidth,
                team_position: teamPositionWidth,
                team_names: teamNamesWidths,
                max_team_name: maxTeamNameWidth,
                left_teams: leftTeamsWidths,
                // center
                table: 0,
                elements: this._getTextMaxWidths(playerTexts, {weight: Dimensions.FONT["OpenSans"].weight["extraBold"]}),
                flag: 36,
                position: playerPositionSize,
                // right
                rating_points: sideElementsWidth,
                team_rating_points_differences: teamRatingPointsDifferencesWidths,
                // total:
                total: 0,
            },
            height: {
                // left
                match_type_number: leftTextBigHeight * 2,
                team_names: teamNameHeights,
                team_position: leftTextBigHeight * 1.2,
                // center
                table_row: tableRowHeight,
                teams: teamHeights,
                flag: 26,
                position: playerPositionSize,
                // right
                rating_points: leftTextBigHeight * 2,
                team_rating_points_differences: this._measureText("±0", {size: leftTextsBigSize}).height,
                // total
                total: totalHeight,
            },
            margin: {
                // left
                left_texts: [0, 0],
                team_name: teamNameMargin,
                // center
                table: [0, data.canvas.margin.y],
                table_row: [0, paddingTableElement],
                elements: {
                    name: [data.canvas.margin.x, 0],
                    flag: marginPlayerElement,
                    scores: marginPlayerElement,
                    totalScores: marginPlayerElement,
                    position: marginPlayerElement,
                    penalty: [32, 0],
                },
                // right
                right_texts: [data.canvas.margin.x - (Helper.hasPenalty(table.teams) ? 10 : 0), 0],
                team_rating_points_differences: teamRatingPointsDifferencesMargins,
            },
            padding: {
                elements: {
                    big: [32, 0],
                    medium: [26, 0],
                    small: [12, 0],
                },
            }
        }
        dimensions.width.elements.totalScores = this._getTextMaxWidths({totalScores: playerTexts.totalScores}, {weight: Dimensions.FONT["OpenSans"].weight["extraBold"]}).totalScores;

        // set width for the team tables (players)
        dimensions.width.table += dimensions.width.elements.name + dimensions.padding.elements.big[0] + dimensions.margin.elements.name[0];
        dimensions.width.table += dimensions.width["flag"] + dimensions.padding.elements.small[0] + dimensions.margin.elements.flag[0];
        dimensions.width.table += (dimensions.width.elements.scores + dimensions.padding.elements.medium[0] + dimensions.margin.elements.scores[0]) * Helper.getMaxNbScores(table.teams);
        dimensions.width.table += dimensions.width.elements.totalScores + dimensions.padding.elements.medium[0] + dimensions.margin.elements.totalScores[0];
        dimensions.width.table += dimensions.width.position + dimensions.padding.elements.medium[0] + dimensions.margin.elements.position[0];
        if (Helper.hasPenalty(table.teams)) {
            dimensions.width.table += dimensions.width.elements.penalty + dimensions.margin.elements.penalty[0];
        }
        dimensions.width.table = Math.ceil(dimensions.margin.table[0] + dimensions.width.table);

        // set total width
        dimensions.width.total = (table.isTeamMode ? dimensions.width.team_position + dimensions.margin.team_name[0] + dimensions.width.max_team_name : dimensions.width.match_type_number) + dimensions.width.table + dimensions.margin.right_texts[0] + dimensions.width.rating_points;

        // return scores dimensions
        return dimensions;
    }

    _getResultsDimensions(lobbyResults, table, board, data) {
        // create an object of all elements (texts basically) needed for results
        const texts = {
            originalRanking: [],
            rankingShift: [],
            finalRanking: [],
            name: [],
            originalRating: [],
            delta: [],
            ratingShift: [],
            finalRating: [],
            tier: [],
        };

        let isTierShift = false;

        // save all texts of those elements
        for (let [name, player] of Object.entries(lobbyResults)) {
            texts.name.push(Helper.getName(player.name, 24));
            texts.originalRanking.push(player.hasOwnProperty("originalRanking") ? (player.originalRanking ? `#${player.originalRanking}` : "#") : "");
            texts.rankingShift.push(player.hasOwnProperty("originalRanking") ? "▲" : "");
            texts.finalRanking.push(player.hasOwnProperty("finalRanking") ? (player.finalRanking ? `#${player.finalRanking}` : "#") : "");
            texts.originalRating.push(Math.floor(player.originalRating).toString());
            texts.delta.push(Math.floor(player.delta) >= 0 ? `+${Math.floor(player.delta)}` : `-${Math.floor(Math.abs(player.delta))}`);
            texts.ratingShift.push("▲");
            texts.finalRating.push(Math.floor(player.finalRating));
            texts.tier.push(player.tier.text);
            if (player.tier.shift) {
                isTierShift = true;
            }
        }

        // check if rankings are available
        const useRankings = Helper.areRankingsAvailable(lobbyResults);

        // set various dimensions needed later
        const headerTextSize = 30;
        const tableStartEndElementPadding = [24, 0];
        const margin = [64, 0];
        const marginSmall = [28, 0];
        const marginNone = [0, 0];
        const marginStartColumn = [tableStartEndElementPadding[0], 0];

        // initialize dimensions array
        const dimensions = {
            font: {
                header: headerTextSize,
            },
            width: {
                text: this._getTextMaxWidths(texts, {weight: Dimensions.FONT["OpenSans"].weight["bold"]}),
                shift: this._measureText("▲", {weight: Dimensions.FONT["OpenSans"].weight["bold"]}).height * 0.85,
                table: 0,
                total: 0,
            },
            height: {
                table_row: 60,
                header: this._measureText("O", {size: headerTextSize, weight: Dimensions.FONT["OpenSans"].weight["bold"]}).height,
                shift: this._measureText("▲", {weight: Dimensions.FONT["OpenSans"].weight["bold"]}).height * 0.85,
                total: 0,
            },
            margin: {
                table: [0, 0],
                header: [0, data.canvas.margin.y],
                elements: {
                    value: {
                        originalRanking: useRankings ? marginStartColumn : marginNone,
                        rankingShift: useRankings ? marginSmall : marginNone,
                        finalRanking: useRankings ? marginSmall : marginNone,
                        name: useRankings ? margin : marginStartColumn,
                        originalRating: margin,
                        delta: margin,
                        ratingShift: marginSmall,
                        finalRating: marginSmall,
                        tier: marginSmall
                    },
                    sum: marginNone,
                },
            },
            padding: {
                tierWrapper: [0, -14],
                tier: [0, 7]
            }
        }

        // set margin sums for elements
        dimensions.margin.elements.sum[0] = parseInt(Object.values(dimensions.margin.elements.value).map(arr => arr[0]).reduce((acc, value) => acc + value, 0) + tableStartEndElementPadding[0]);
        dimensions.margin.elements.sum[1] = parseInt(Object.values(dimensions.margin.elements.value).map(arr => arr[1]).reduce((acc, value) => acc + value, 0));

        // fix width of tiers
        dimensions.width.text.tier += (2 * dimensions.margin.elements.value.tier[0]) + (isTierShift ? dimensions.width.shift + this._measureText(" ", {weight: Dimensions.FONT["OpenSans"].weight["bold"]}).width : 0);

        // set width for the results table
        for (let [name, width] of Object.entries(dimensions.width.text)) {
            dimensions.width.table += width;
        }
        dimensions.width.table = Math.ceil(dimensions.margin.table[0] + dimensions.width.table + dimensions.margin.elements.sum[0] + dimensions.margin.table[0]);

        // set totals
        dimensions.width.total = dimensions.width.table;
        dimensions.height.total = dimensions.height.header + dimensions.margin.header[1] + Math.ceil(Object.keys(lobbyResults).length * dimensions.height.table_row);

        // return results dimensions
        return dimensions;
    }

    /**
     * Get maximum widths for all texts in the texts object
     *
     * @param {Object} texts Object of arrays of texts grouped by object key
     * @param {Object|null} font
     *
     * @returns {Object}
     * @private
     */
    _getTextMaxWidths(texts, font = null) {
        const widths = {};
        for (let [name, values] of Object.entries(texts)) {
            widths[name] = Math.max(...values.map((text) => font ? this._measureText(text, font).width : this._canvas.ctx.measureText(text).width));
        }
        return widths;
    }

    /**
     * Measure a text by a font
     *
     * @param {string} text
     * @param {Object} font
     *
     * @returns {{width: number, height: number}|null}
     * @private
     */
    _measureText(text, font = {}) {
        if (!font.hasOwnProperty("size")) {
            font.size = Dimensions.FONT["OpenSans"].size;
        }
        if (!font.hasOwnProperty("weight")) {
            font.weight = Dimensions.FONT["OpenSans"].weight["medium"];
        }
        if (!font.hasOwnProperty("family")) {
            font.family = Dimensions.FONT["OpenSans"].family;
        }

        let fontWeight = font.weight;
        if (font.weight === 1000) {
            fontWeight = 900;
            font.family += "Slab";
        }

        const newFont = `${fontWeight} ${font.size}px ${font.family}`;
        const currentFont = this._canvas.ctx.font;
        this._canvas.ctx.font = newFont;
        const textDimensions = this._canvas.ctx.measureText(text);
        this._canvas.ctx.font = currentFont;
        return {
            width: textDimensions.width,
            height: textDimensions.actualBoundingBoxAscent + textDimensions.actualBoundingBoxDescent
        }
    }
}

module.exports = Dimensions;
