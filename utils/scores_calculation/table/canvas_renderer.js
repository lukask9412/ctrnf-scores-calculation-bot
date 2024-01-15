const TableCanvas = require('./table_canvas');
const Colors = require('./colors');
const Dimensions = require('./dimensions');
const Helper = require('./helper');

/**
 * Class that handles the rendering of the canvas itself.
 */
class CanvasRenderer {
    get canvas() {
        return this._canvas;
    }

    set dimensions(dimensions) {
        this._dimensions = dimensions;
    }

    set lobbyResults(lobbyResults) {
        this._lobbyResults = lobbyResults;
    }

    set table(table) {
        this._table = table;
    }

    set board(board) {
        this._board = board;
    }

    constructor() {
        this._blocks = {};
        this._tableCanvas = null;
        this._canvas = null;
        this._colors = new Colors();
        this._dimensions = {}
    }

    /**
     * Draw the whole table
     *
     * @returns {Buffer|null}
     */
    async draw() {
        this._blocks = {};
        this._tableCanvas = new TableCanvas(this._dimensions);
        this._canvas = this._tableCanvas.canvas;

        this._drawBackground();
        this._drawHeader();
        await this._drawScores();
        await this._drawResults();

        return this.getBuffer();
    }

    /**
     * Return the canvas buffer
     *
     * @returns {Buffer|null}
     */
    getBuffer() {
        // check if canvas is valid
        const isValidaCanvas = this._tableCanvas && this._canvas && this._canvas.obj;

        // get the buffer
        const buffer = isValidaCanvas ? this._canvas.obj.toBuffer() : null;
        if (null === buffer) {
            return null;
        }

        // return the buffer
        if (Buffer.isBuffer(buffer)) {
            return buffer;
        }

        return null;
    }

    /**
     * Draw the background of the table
     *
     * @private
     */
    _drawBackground() {
        this._block("background", {
            x: 0,
            y: 0,
            width: this._canvas.obj.width,
            height: this._canvas.obj.height,
            background: this._colors.get("white"),
        });
        this._setOrigin(0, 0);
    }

    /**
     * Draw the header of the table
     *
     * @private
     */
    _drawHeader() {
        const isSmallTemplate = Helper.getMaxNbScores(this._table.teams) < 6;
        let headerText = isSmallTemplate ? Helper.getName(this._board.name, 24) : this._board.name;
        if (this._table && this._table.hasOwnProperty("lobbyName") && this._table.lobbyName) {
            const lobbyNameChunks = this._table.lobbyName.split("-");
            let lobbyName = this._table.lobbyName;
            if (lobbyNameChunks.length > 1) {
                if (lobbyNameChunks[0].toLowerCase().startsWith("lobby") || lobbyNameChunks[0].toLowerCase().startsWith("#")) {
                    lobbyName = lobbyNameChunks[1].trim() + " - " + lobbyNameChunks[0].trim();
                }
                if (lobbyNameChunks[1].toLowerCase().startsWith("lobby") || lobbyNameChunks[1].toLowerCase().startsWith("#")) {
                    lobbyName = lobbyNameChunks[0].trim() + " - " + lobbyNameChunks[1].trim();
                }
            }
            headerText += " | " + lobbyName;
        }
        this._block("header", {
            x: 0,
            y: 0,
            width: this._canvas.obj.width,
            height: this._dimensions.header["height"],
            border: null,
            background: this._colors.get("black"),
            color: this._colors.get("white"),
            margin: null,
            text: [
                {
                    content: headerText,
                    align: "left",
                    margin: [this._dimensions.header["text"].margin, 0],
                    font: `${Dimensions.FONT["OpenSans"].weight["black"]} ${isSmallTemplate ? "26" : this._dimensions.header.font}px ${Dimensions.FONT["OpenSans"].family}`,
                }, {
                    content: Helper.getDate(),
                    align: "right",
                    margin: [-this._dimensions.header["text"].margin, 0],
                    font: `${Dimensions.FONT["OpenSans"].weight["black"]} ${isSmallTemplate ? "26" : this._dimensions.header.font}px ${Dimensions.FONT["OpenSans"].family}`,
                },
            ]
        });
        this._setOrigin(0, this._dimensions.header["height"] + this._dimensions.header["margin"].y);
    }

    /**
     * Draw the scores table
     *
     * @private
     */
    async _drawScores() {
        // set coords to the start of the scores table
        const scoresXY = [
            0,
            this._blocks["header"].outerHeight,
        ];
        this._setOrigin(
            scoresXY[0],
            scoresXY[1],
        );

        // initialize variable that will hold sum of team heights
        let teamsSumHeight = 0;

        // x coord of the scores content
        // basically centers the content
        const contentX = (this._canvas.obj.width / 2) - (this._dimensions.scores.width.total / 2);

        // coords of the current team table
        const tableXY = [
            contentX + (this._table.isTeamMode ? this._dimensions.scores.width.team_position + this._dimensions.scores.margin.team_name[0] + this._dimensions.scores.width.max_team_name : this._dimensions.scores.width.match_type_number),
            0
        ];

        // set origin for the first team
        this._setOrigin(
            scoresXY[0],
            scoresXY[1],
        );

        // set helper variables
        const maxNbScores = Helper.getMaxNbScores(this._table.teams);
        const hasPenalty = Helper.hasPenalty(this._table.teams);

        // start iterating over all teams
        for (let [i, team] of this._table.teams.entries()) {
            // draw a team background
            const isSoloMatchTeam = !this._table.isTeamMode && i === 0;
            if (this._table.isTeamMode || isSoloMatchTeam) {
                this._block(`team_${i}_background`, {
                    x: this._canvas.x,
                    y: this._canvas.y,
                    width: this._canvas.obj.width,
                    height: this._dimensions.scores.height.teams[i],
                    background: this._colors.getTeamColor(i, team.color, this._table.teams.length),
                });
            }

            // set origin to the content origin
            this._setOrigin(
                contentX,
                this._canvas.y,
            );

            // if the current lobby was a team mode
            // draw a team rank and name
            if (this._table.isTeamMode) {
                // rank
                // right
                //const teamX = this._canvas.x + Math.max(...this._dimensions.scores.width.left_teams) - this._dimensions.scores.width.left_teams[i];
                // center
                // const teamX = this._canvas.x + (Math.max(...this._dimensions.scores.width.left_teams) / 2) - (this._dimensions.scores.width.left_teams[i] / 2);
                // left
                const teamX = this._canvas.x;
                this._setOrigin(
                    teamX,
                    scoresXY[1] + teamsSumHeight + (this._dimensions.scores.height.teams[i] / 2) - (this._dimensions.scores.height.team_names[i] / 2),
                );

                let rank = await Helper.getRank(team.position, Helper.getLastPlaceNumber(this._lobbyResults), false);
                if ("string" === typeof rank) {
                    this._block(`team_${i}_rank`, {
                        x: teamX,
                        y: this._canvas.y,
                        width: this._dimensions.scores.width.team_position,
                        height: this._dimensions.scores.height.team_names[i],
                        color: this._colors.get("black"),
                        text: [{
                            content: rank,
                            align: "center",
                            font: `${Dimensions.FONT["OpenSans"].weight["black"]} ${this._dimensions.scores.font.team_position}px ${Dimensions.FONT["OpenSans"].family}`,
                        }],
                    });
                } else {
                    this._image(`team_${i}_rank`, {
                        image: rank,
                        x: teamX,
                        y: this._canvas.y + (this._dimensions.scores.height.team_names[i] / 2) - (this._dimensions.scores.height.team_position / 2),
                        width: this._dimensions.scores.width.team_position,
                        height: this._dimensions.scores.height.team_position,
                    });
                }
                this._addToOrigin(this._blocks[`team_${i}_rank`].outerWidth, 0);

                // team name
                //
                // prepare team name
                let teamName = team.name.split("-");
                if (teamName.length > 1 && teamName[1].trim().length > 0) {
                    teamName = [teamName[0].trim(), teamName[1].trim()];
                } else {
                    teamName[0] = team.name;
                }
                const teamNameTexts = [];
                for (let [i, row] of teamName.entries()) {
                    if (0 === i) {
                        teamNameTexts.push({
                            content: Helper.getName(row, 10),
                            align: "center",
                            font: `${Dimensions.FONT["OpenSans"].weight["black"]} ${this._dimensions.scores.font.team_name}px ${Dimensions.FONT["OpenSans"].family}`,
                            margin: teamName.length > 1 ? [0, -5] : [0, 0],
                        });
                    } else {
                        teamNameTexts.push({
                            content: Helper.getName(row),
                            align: "center",
                            font: `${Dimensions.FONT["OpenSans"].weight["bold"]} ${Dimensions.FONT["OpenSans"].size}px ${Dimensions.FONT["OpenSans"].family}`,
                            margin: [0, 5],
                        });
                    }
                }

                // draw the name
                this._block(`team_${i}_name`, {
                    x: this._canvas.x,
                    y: this._canvas.y,
                    width: this._dimensions.scores.width.team_names[i],
                    height: this._dimensions.scores.height.team_names[i],
                    color: this._colors.get("black"),
                    margin: this._dimensions.scores.margin.team_name,
                    text_direction: "column",
                    text: teamNameTexts
                });
            }

            // set origin of the team table (players)
            tableXY[1] = scoresXY[1] + teamsSumHeight + this._dimensions.scores.margin["table"][1];
            this._setOrigin(
                tableXY[0],
                tableXY[1],
            );

            // this variable will hold the latest x coord of the last element in the team table (player line)
            let lastTableX = tableXY[0];

            // set players that will be drawn for the current team iteration
            // in solo mode, all players will be drawn in the first iteration
            let players = [];
            if (this._table.isTeamMode) {
                players = team.players;
            } else if (isSoloMatchTeam) {
                for (let [i, team] of this._table.teams.entries()) {
                    for (let [j, player] of team.players.entries()) {
                        players.push(player)
                    }
                }
            }

            // set team penalty (as a player line)
            // team penalty is rendered under the last team player with the same style as a player line
            let teamPenalty = 0;
            if (this._table.isTeamMode) {
                const playersPenalty = [...team.players.values()].reduce((totalPenalty, player) => totalPenalty + player.penalty, 0);
                teamPenalty = team.penalty - playersPenalty;
                if (0 !== teamPenalty) {
                    players.push({
                        name: teamPenalty > 0 ? "PENALTY" : "BONUS",
                        flag: null,
                        scores: [teamPenalty > 0 ? (teamPenalty * -1) : Math.abs(teamPenalty)],
                        position: null,
                        penalty: null,
                        isTeamPenalty: true,
                    })
                }
            }

            // iterate over players and draw the team table (players)
            for (let [j, player] of players.entries()) {
                const isTeamPenalty = player.hasOwnProperty("isTeamPenalty") && player.isTeamPenalty;

                // player name
                this._block(`scores_team_${i}_player_${j}_name`, {
                    x: this._canvas.x,
                    y: this._canvas.y,
                    width: this._dimensions.scores.padding.elements.big[0] + this._dimensions.scores.width.elements.name,
                    height: this._dimensions.scores.height.table_row,
                    color: this._colors.get("black"),
                    background: "rgba(0, 0, 0, 0.11)",
                    margin: this._dimensions.scores.margin.elements.name,
                    border: {top_left: true, top_right: false, bottom_left: true, bottom_right: false},
                    text: [{
                        content: Helper.getName(player.name),
                        font: `${Dimensions.FONT["OpenSans"].weight["extraBold"]} ${Dimensions.FONT["OpenSans"].size}px ${Dimensions.FONT["OpenSans"].family}`,
                    }]
                });
                this._addToOrigin(this._blocks[`scores_team_${i}_player_${j}_name`].outerWidth, 0);

                // player flag
                let flag = !isTeamPenalty ? await Helper.getFlag(player.flag) : null;
                this._block(`scores_team_${i}_player_${j}_flag`, {
                    x: this._canvas.x,
                    y: this._canvas.y,
                    width: this._dimensions.scores.padding.elements.small[0] + this._dimensions.scores.width["flag"],
                    height: this._dimensions.scores.height.table_row,
                    background: "rgba(0, 0, 0, 0.11)",
                    margin: this._dimensions.scores.margin.elements.flag,
                });
                if (isTeamPenalty) {
                    // do not draw a flag
                } else if ("string" !== typeof flag) {
                    this._image(`scores_team_${i}_player_${j}_flag_image`, {
                        image: flag,
                        x: this._canvas.x + (this._dimensions.scores.padding.elements.small[0] / 2),
                        y: this._canvas.y + ((this._dimensions.scores.height.table_row - this._dimensions.scores.height["flag"]) / 2),
                        width: this._dimensions.scores.width["flag"],
                        height: this._dimensions.scores.height["flag"],
                        margin: this._dimensions.scores.margin.elements.flag,
                        border: "round",
                    });
                } else {
                    this._block(`scores_team_${i}_player_${j}_flag_image`, {
                        x: this._canvas.x,
                        y: this._canvas.y,
                        width: this._dimensions.scores.padding.elements.small[0] + this._dimensions.scores.width["flag"],
                        height: this._dimensions.scores.height.table_row,
                        margin: this._dimensions.scores.margin.elements.flag,
                        text: [{
                            content: player.flag.toUpperCase().substring(0, 2),
                            font: `${Dimensions.FONT["OpenSans"].weight["extraBold"]} ${Dimensions.FONT["OpenSans"].size}px ${Dimensions.FONT["OpenSans"].family}`,
                        }]
                    });
                }
                this._addToOrigin(this._blocks[`scores_team_${i}_player_${j}_flag`].outerWidth, 0);

                // player scores (one score per one track)
                let total = 0;
                for (let k = 0; k < maxNbScores; k++) {
                    const score = !isTeamPenalty ? (player.scores.hasOwnProperty(k) ? player.scores[k] : 0) : "";
                    this._block(`scores_team_${i}_player_${j}_score_${k}`, {
                        x: this._canvas.x,
                        y: this._canvas.y,
                        width: this._dimensions.scores.padding.elements.medium[0] + this._dimensions.scores.width.elements.scores,
                        height: this._dimensions.scores.height.table_row,
                        color: this._colors.get("black"),
                        background: "rgba(0, 0, 0, 0.11)",
                        margin: this._dimensions.scores.margin.elements.scores,
                        text: [{
                            content: score,
                            font: `${Dimensions.FONT["OpenSans"].weight["extraBold"]} ${Dimensions.FONT["OpenSans"].size}px ${Dimensions.FONT["OpenSans"].family}`,
                        }]
                    });
                    total += this._blocks[`scores_team_${i}_player_${j}_score_${k}`].outerWidth;
                    this._addToOrigin(this._blocks[`scores_team_${i}_player_${j}_score_${k}`].outerWidth, 0);
                }

                // player total scores sum
                this._block(`scores_team_${i}_player_${j}_total_scores`, {
                    x: this._canvas.x,
                    y: this._canvas.y,
                    width: this._dimensions.scores.padding.elements.medium[0] + this._dimensions.scores.width.elements.totalScores,
                    height: this._dimensions.scores.height.table_row,
                    color: this._colors.get("black"),
                    background: "#ffffff40",
                    margin: this._dimensions.scores.margin.elements.totalScores,
                    text: [{
                        content: player.scores.reduce((a, b) => a + b, 0).toString(),
                        font: `${Dimensions.FONT["OpenSans"].weight["black"]} ${Dimensions.FONT["OpenSans"].size}px ${Dimensions.FONT["OpenSans"].family}`,
                    }]
                });
                this._addToOrigin(this._blocks[`scores_team_${i}_player_${j}_total_scores`].outerWidth, 0);

                // player lobby position
                let playerPosition = await Helper.getRank(player.position, Helper.getLastPlaceNumber(this._lobbyResults), false);
                this._block(`scores_team_${i}_player_${j}_position`, {
                    x: this._canvas.x,
                    y: this._canvas.y,
                    width: this._dimensions.scores.padding.elements.medium[0] + this._dimensions.scores.width.position,
                    height: this._dimensions.scores.height.table_row,
                    background: "rgba(0, 0, 0, 0.11)",
                    margin: this._dimensions.scores.margin.elements.position,
                    border: {top_left: false, top_right: true, bottom_left: false, bottom_right: true},
                });
                if (isTeamPenalty) {
                    // do nothing
                } else if ("string" !== typeof playerPosition) {
                    this._image(`scores_team_${i}_player_${j}_position_image`, {
                        image: playerPosition,
                        x: this._canvas.x + ((this._dimensions.scores.padding.elements.medium[0] + this._dimensions.scores.width.position) / 2) - ((this._dimensions.scores.height.table_row * 0.8) / 2),
                        y: this._canvas.y + (this._dimensions.scores.height.table_row / 2) - ((this._dimensions.scores.height.table_row * 0.8) / 2),
                        width: this._dimensions.scores.height.table_row * 0.8,
                        height: this._dimensions.scores.height.table_row * 0.8,
                        margin: this._dimensions.scores.margin.elements.position,
                    });
                } else {
                    this._block(`scores_team_${i}_player_${j}_position_image`, {
                        x: this._canvas.x,
                        y: this._canvas.y,
                        width: this._dimensions.scores.padding.elements.medium[0] + this._dimensions.scores.width.position,
                        height: this._dimensions.scores.height.table_row,
                        color: this._colors.get("black"),
                        margin: this._dimensions.scores.margin.elements.position,
                        text: [{
                            content: playerPosition,
                            font: `${Dimensions.FONT["OpenSans"].weight["bold"]} ${Dimensions.FONT["OpenSans"].size}px ${Dimensions.FONT["OpenSans"].family}`,
                        }]
                    });
                }
                this._addToOrigin(this._blocks[`scores_team_${i}_player_${j}_position`].outerWidth, 0);

                // penalty if exists
                if (hasPenalty) {
                    if (!isTeamPenalty && 0 !== player.penalty) {
                        this._block(`scores_team_${i}_player_${j}_penalty`, {
                            x: this._canvas.x,
                            y: this._canvas.y,
                            width: this._dimensions.scores.width.penalty,
                            height: this._dimensions.scores.height.table_row,
                            color: this._colors.get("black"),
                            margin: this._dimensions.scores.margin.elements.penalty,
                            text: [{
                                content: player.penalty > 0 ? `-${player.penalty}` : `+${Math.abs(player.penalty)}`,
                                font: `${Dimensions.FONT["OpenSans"].weight["extraBold"]} ${Dimensions.FONT["OpenSans"].size}px ${Dimensions.FONT["OpenSans"].family}`,
                            }]
                        });
                    }
                    this._addToOrigin(this._dimensions.scores.width.elements.penalty + this._dimensions.scores.margin.elements.penalty[0], 0);
                }

                // shift coords
                lastTableX = this._canvas.x;
                this._addToOrigin(0, this._blocks[`scores_team_${i}_player_${j}_name`].outerHeight + this._dimensions.scores.margin.table_row[1]);
                this._setOrigin(tableXY[0], this._canvas.y);
            }

            // draw total points for a team (or a match in case of a solo mode)
            if (this._table.isTeamMode || isSoloMatchTeam) {
                // rating points
                this._setOrigin(
                    lastTableX,
                    scoresXY[1] + teamsSumHeight + (this._dimensions.scores.height.teams[i] / 2) - (this._dimensions.scores.height.rating_points / 2),
                );

                const ratingPoints = this._table.isTeamMode ? team.score - team.penalty : Helper.getTotalMatchPoints(this._table.teams);
                this._block(`team_${i}_rating_points`, {
                    x: this._canvas.x,
                    y: this._canvas.y,
                    width: this._dimensions.scores.width.rating_points,
                    height: this._dimensions.scores.height.rating_points,
                    color: this._colors.get("black"),
                    margin: this._dimensions.scores.margin.right_texts,
                    text: [
                        {
                            content: ratingPoints.toString(),
                            align: "left",
                            font: `${Dimensions.FONT["OpenSans"].weight["black"]} ${this._dimensions.scores.font.rating_points}px ${Dimensions.FONT["OpenSans"].family}`,
                        }
                    ]
                });
            }

            // draw team point differences
            if (this._table.isTeamMode) {
                this._setOrigin(
                    this._canvas.x,
                    scoresXY[1] + teamsSumHeight - (this._dimensions.scores.height.team_rating_points_differences / 2),
                );
                this._block(`team_${i}_rating_points_difference`, {
                    x: this._canvas.x,
                    y: this._canvas.y,
                    width: this._dimensions.scores.width.rating_points,
                    height: this._dimensions.scores.height.team_rating_points_differences,
                    color: this._colors.get("black"),
                    margin: this._dimensions.scores.margin.team_rating_points_differences[i],
                    text: [
                        {
                            content: 0 === i ? "" : "±" + (this._table.teams[i - 1].score - this._table.teams[i - 1].penalty - (team.score - team.penalty)),
                            align: "left",
                            font: `${Dimensions.FONT["OpenSans"].weight["bold"]} ${this._dimensions.scores.font.team_rating_points_differences}px ${Dimensions.FONT["OpenSans"].family}`,
                        }
                    ]
                });
            }

            // increment teams sum height (height of all teams)
            teamsSumHeight += this._dimensions.scores.height.teams[i];

            // set coords to the start of the scores table
            this._setOrigin(
                scoresXY[0],
                scoresXY[1],
            );
            // increment y coord by the sum of teams heights
            this._addToOrigin(0, teamsSumHeight);
        }

        // if the lobby is a solo mode
        // draw match type and number (on the left)
        if (!this._table.isTeamMode) {
            this._setOrigin(
                contentX,
                scoresXY[1] + (this._dimensions.scores.height.teams[0] / 2) - (this._dimensions.scores.height.match_type_number / 2),
            );

            const lobbyType = this._table.lobbyType.split("_")[1].toUpperCase();
            const lobbyNumber = `#${this._table.lobbyNumber}`;

            this._block(`match_type_number`, {
                x: this._canvas.x,
                y: this._canvas.y,
                width: this._dimensions.scores.width.match_type_number,
                height: this._dimensions.scores.height.match_type_number,
                color: this._colors.get("black"),
                margin: this._dimensions.scores.margin.left_texts,
                text_direction: "column",
                text: [
                    {
                        content: lobbyType,
                        align: "center",
                        font: `${Dimensions.FONT["OpenSans"].weight["black"]} ${this._dimensions.scores.font.match_type_number}px ${Dimensions.FONT["OpenSans"].family}`,
                    },
                    {
                        content: lobbyNumber,
                        align: "center",
                        font: `${Dimensions.FONT["OpenSans"].weight["black"]} ${this._dimensions.scores.font.match_type_number}px ${Dimensions.FONT["OpenSans"].family}`,
                    }
                ]
            });
        }
    }

    /**
     * Draw the results table
     *
     * @private
     */
    async _drawResults() {
        // player index
        let index = 1;

        // x coord of the results content
        // basically centers the content
        const contentX = (this._canvas.obj.width / 2) - (this._dimensions.results.width.total / 2);

        this._setOrigin(
            contentX,
            this._dimensions.header["height"] + this._dimensions.scores.height.total,
        );

        // draw the results header
        this._block(`rating_updates_header`, {
            x: this._canvas.x,
            y: this._canvas.y,
            width: this._dimensions.results.width["table"],
            height: this._dimensions.results.height.header,
            margin: this._dimensions.results.margin.header,
            text: [{
                content: "Rating Updates",
                align: "left",
                font: `${Dimensions.FONT["OpenSans"].weight["bold"]} ${this._dimensions.results.font.header}px ${Dimensions.FONT["OpenSans"].family}`,
            }]
        });
        this._setOrigin(
            contentX,
            this._blocks["rating_updates_header"].y + this._blocks["rating_updates_header"].height + this._dimensions.results.margin.header[1],
        );

        // check if rankings are available
        const useRankings = Helper.areRankingsAvailable(this._lobbyResults);

        // start drawing the player table
        let lastTierColor = null;

        const isBlackColor = (color) => {
            const colors = [
                "black",
                "#000",
                "#000000",
                "#000000ff",
                "rgb(0,0,0)",
                "rgba(0,0,0,0)",
            ]
            return colors.includes(color.replace(/\s/g, '').toLowerCase())
        }

        const getTierBackgroundColor = (color) => {
            const isBlack = isBlackColor(color);
            let tierColor = this._colors.hexToRGBA(color, 0.11);

            const colorSimilarities = this._colors.getColorSimilarity(color);
            if (colorSimilarities.white < 0.015) {
                tierColor = this._colors.hexToRGBA(this._colors.darkenColor(color, 0.05), 0.25);
            } else if (colorSimilarities.black < 0.015 && !isBlack) {
                tierColor = this._colors.hexToRGBA(this._colors.lightenColor(color, 0.05), 0.25);
            } else if (colorSimilarities.white < 0.1) {
                tierColor = this._colors.hexToRGBA(color, 0.2);
            } else if (colorSimilarities.black < 0.1 && !isBlack) {
                tierColor = this._colors.hexToRGBA(color, 0.2);
            }

            if (lastTierColor === tierColor) {
                tierColor = this._colors.generateSimilarColor(tierColor);
            }

            lastTierColor = tierColor;
            return tierColor;
        }

        for (let [name, player] of Object.entries(this._lobbyResults)) {
            // get a background color of the current results row by a tier color
            let tierColor = getTierBackgroundColor(player.tier.color);

            // draw the player row block (background)
            this._block(`results_player_${index}_row`, {
                x: this._canvas.x,
                y: this._canvas.y,
                width: this._dimensions.results.width["table"],
                height: this._dimensions.results.height.table_row,
                background: tierColor,
                border: 1 === index ? {"top_left": true, "top_right": true, "bottom_left": false, "bottom_right": false} : (index === Object.keys(this._lobbyResults).length ? {
                    "top_left": false,
                    "top_right": false,
                    "bottom_left": true,
                    "bottom_right": true
                } : null)
            });

            // if rankings are available, then draw them
            if (useRankings) {
                // original ranking
                this._block(`results_player_${index}_original_ranking`, {
                    x: this._canvas.x,
                    y: this._canvas.y,
                    width: this._dimensions.results.width.text.originalRanking,
                    height: this._dimensions.results.height.table_row,
                    color: this._colors.get("default"),
                    margin: [this._dimensions.results.margin.elements.value.originalRanking[0], this._dimensions.results.margin.elements.value.originalRanking[1]],
                    text: [{
                        content: player.hasOwnProperty("originalRanking") && player.originalRanking && player.originalRanking ? `#${player.originalRanking}` : "#",
                        align: "center",
                        font: `${Dimensions.FONT["OpenSans"].weight["bold"]} ${Dimensions.FONT["OpenSans"].size}px ${Dimensions.FONT["OpenSans"].family}`,
                    }]
                });
                this._addToOrigin(this._blocks[`results_player_${index}_original_ranking`].outerWidth, 0);

                // ranking shift
                const rankingShiftSymbol = Helper.getRankingShiftSymbol(player);
                const rankingShift = await Helper.getShiftImage(rankingShiftSymbol);
                const deltaRankingColor = "▲" === rankingShiftSymbol ? this._colors.get("delta")["positive"] : ("▼" === rankingShiftSymbol ? this._colors.get("delta")["negative"] : this._colors.get("delta")["default"]);
                if ("string" === typeof rankingShift) {
                    this._block(`results_player_${index}_ranking_shift`, {
                        x: this._canvas.x,
                        y: this._canvas.y,
                        width: this._dimensions.results.width.text.rankingShift,
                        height: this._dimensions.results.height.table_row,
                        color: deltaRankingColor,
                        margin: this._dimensions.results.margin.elements.value.rankingShift,
                        text: [{
                            content: rankingShift,
                            align: "center",
                            font: `${Dimensions.FONT["OpenSans"].weight["bold"]} ${Dimensions.FONT["OpenSans"].size}px ${Dimensions.FONT["OpenSans"].family}`,
                        }]
                    });
                } else {
                    this._image(`results_player_${index}_ranking_shift`, {
                        image: rankingShift,
                        x: this._canvas.x + (this._dimensions.results.width.shift / 2) - (this._dimensions.results.width.shift / 2),
                        y: this._canvas.y + (this._dimensions.results.height.table_row / 2) - (this._dimensions.results.height.shift / 2),
                        width: this._dimensions.results.width.shift,
                        height: this._dimensions.results.height.shift,
                        margin: this._dimensions.results.margin.elements.value.rankingShift,
                    });
                }
                this._addToOrigin(this._blocks[`results_player_${index}_ranking_shift`].outerWidth, 0);

                // final ranking
                this._block(`results_player_${index}_final_ranking`, {
                    x: this._canvas.x,
                    y: this._canvas.y,
                    width: this._dimensions.results.width.text.finalRanking,
                    height: this._dimensions.results.height.table_row,
                    color: deltaRankingColor,
                    margin: this._dimensions.results.margin.elements.value.finalRanking,
                    text: [{
                        content: player.hasOwnProperty("finalRanking") && player.finalRanking && player.finalRanking ? `#${player.finalRanking}` : "#",
                        align: "center",
                        font: `${Dimensions.FONT["OpenSans"].weight["bold"]} ${Dimensions.FONT["OpenSans"].size}px ${Dimensions.FONT["OpenSans"].family}`,
                    }]
                });
                this._addToOrigin(this._blocks[`results_player_${index}_final_ranking`].outerWidth, 0);
            }

            // player name
            this._block(`results_player_${index}_name`, {
                x: this._canvas.x,
                y: this._canvas.y,
                width: this._dimensions.results.width.text.name,
                height: this._dimensions.results.height.table_row,
                color: this._colors.get("default"),
                margin: [this._dimensions.results.margin.elements.value.name[0], this._dimensions.results.margin.elements.value.name[1]],
                text: [{
                    content: Helper.getName(player.name, 24),
                    align: "center",
                    font: `${Dimensions.FONT["OpenSans"].weight["bold"]} ${Dimensions.FONT["OpenSans"].size}px ${Dimensions.FONT["OpenSans"].family}`,
                }]
            });
            this._addToOrigin(this._blocks[`results_player_${index}_name`].outerWidth, 0);

            // original rating
            this._block(`results_player_${index}_original_rating`, {
                x: this._canvas.x,
                y: this._canvas.y,
                width: this._dimensions.results.width.text.originalRating,
                height: this._dimensions.results.height.table_row,
                color: this._colors.get("default"),
                margin: [this._dimensions.results.margin.elements.value.originalRating[0], this._dimensions.results.margin.elements.value.originalRating[1]],
                text: [{
                    content: Math.floor(player.originalRating).toString(),
                    align: "center",
                    font: `${Dimensions.FONT["OpenSans"].weight["bold"]} ${Dimensions.FONT["OpenSans"].size}px ${Dimensions.FONT["OpenSans"].family}`,
                }]
            });
            this._addToOrigin(this._blocks[`results_player_${index}_original_rating`].outerWidth, 0);

            // rating delta
            const deltaColor = player.delta > 0 ? this._colors.get("delta")["positive"] : (player.delta < 0 ? this._colors.get("delta")["negative"] : this._colors.get("delta")["default"]);
            this._block(`results_player_${index}_delta`, {
                x: this._canvas.x,
                y: this._canvas.y,
                width: this._dimensions.results.width.text.delta,
                height: this._dimensions.results.height.table_row,
                color: deltaColor,
                margin: [this._dimensions.results.margin.elements.value.delta[0], this._dimensions.results.margin.elements.value.delta[1]],
                text: [
                    {
                        content: player.delta >= 0 ? "+" + Math.floor(player.delta).toString() : Math.floor(player.delta).toString(),
                        align: "center",
                        font: `${Dimensions.FONT["OpenSans"].weight["bold"]} ${Dimensions.FONT["OpenSans"].size}px ${Dimensions.FONT["OpenSans"].family}`,
                    }
                ]
            });
            this._addToOrigin(this._blocks[`results_player_${index}_delta`].outerWidth, 0);


            // rating shift
            const ratingShiftSymbol = player.delta > 0 ? "▲" : player.delta < 0 ? "▼" : "–";
            const ratingShift = await Helper.getShiftImage(ratingShiftSymbol);
            const deltaRankingColor = "▲" === ratingShiftSymbol ? this._colors.get("delta")["positive"] : ("▼" === ratingShiftSymbol ? this._colors.get("delta")["negative"] : this._colors.get("delta")["default"]);
            if ("string" === typeof ratingShift) {
                this._block(`results_player_${index}_rating_shift`, {
                    x: this._canvas.x,
                    y: this._canvas.y,
                    width: this._dimensions.results.width.text.ratingShift,
                    height: this._dimensions.results.height.table_row,
                    color: deltaRankingColor,
                    margin: this._dimensions.results.margin.elements.value.ratingShift,
                    text: [{
                        content: ratingShift,
                        align: "center",
                        font: `${Dimensions.FONT["OpenSans"].weight["bold"]} ${Dimensions.FONT["OpenSans"].size}px ${Dimensions.FONT["OpenSans"].family}`,
                    }]
                });
            } else {
                this._image(`results_player_${index}_rating_shift`, {
                    image: ratingShift,
                    x: this._canvas.x + (this._dimensions.results.width.shift / 2) - (this._dimensions.results.width.shift / 2),
                    y: this._canvas.y + (this._dimensions.results.height.table_row / 2) - (this._dimensions.results.height.shift / 2),
                    width: this._dimensions.results.width.shift,
                    height: this._dimensions.results.height.shift,
                    margin: this._dimensions.results.margin.elements.value.ratingShift,
                });
            }
            this._addToOrigin(this._blocks[`results_player_${index}_rating_shift`].outerWidth, 0);

            // final rating
            this._block(`results_player_${index}_final_rating`, {
                x: this._canvas.x,
                y: this._canvas.y,
                width: this._dimensions.results.width.text.finalRating,
                height: this._dimensions.results.height.table_row,
                color: deltaColor,
                margin: [this._dimensions.results.margin.elements.value.finalRating[0], this._dimensions.results.margin.elements.value.finalRating[1]],
                text: [{
                    content: Math.floor(player.finalRating).toString(),
                    align: "center",
                    font: `${Dimensions.FONT["OpenSans"].weight["bold"]} ${Dimensions.FONT["OpenSans"].size}px ${Dimensions.FONT["OpenSans"].family}`,
                }]
            });
            this._addToOrigin(this._blocks[`results_player_${index}_final_rating`].outerWidth, 0);

            // tier
            const tierShiftSymbol = player.tier["shift"];
            const tierTextColor = this._colors.generateTextColorForBackground(this._colors.hexToRGBA(player.tier.color));
            let tierShift = null;
            if (tierShiftSymbol) {
                tierShift = await Helper.getShiftImage(ratingShiftSymbol, tierTextColor);
            }
            // if there is a tier shift
            if (tierShiftSymbol && "string" === typeof tierShift) {
                // update tier text to include tier shift symbol if the image couldn't be fetched
                player.tier.text = `${tierShift} ${player.tier.text}`;
            }

            const useTierShiftImage = tierShiftSymbol && "string" !== typeof tierShift && null !== tierShift;
            const tierTextWidth = this._canvas.ctx.measureText(player.tier.text, {
                family: Dimensions.FONT["OpenSans"].family,
                weight: Dimensions.FONT["OpenSans"].weight["bold"],
                size: Dimensions.FONT["OpenSans"].size
            }).width;
            const tierSpaceWidth = this._canvas.ctx.measureText(" ", {
                family: Dimensions.FONT["OpenSans"].family,
                weight: Dimensions.FONT["OpenSans"].weight["bold"],
                size: Dimensions.FONT["OpenSans"].size
            }).width;
            const tierImageMarginX = (this._dimensions.results.width.text.tier - this._dimensions.results.width.shift - tierTextWidth - tierSpaceWidth) / 2;

            // create tier background with text
            this._block(`results_player_${index}_tier`, {
                x: this._canvas.x,
                y: this._canvas.y + this._dimensions.results.padding.tier[1],
                width: this._dimensions.results.width.text.tier,
                height: this._dimensions.results.height.table_row + this._dimensions.results.padding.tierWrapper[1],
                color: tierTextColor,
                margin: this._dimensions.results.margin.elements.value.tier,
                background: player.tier.color,
                border: "round",
                text: [{
                    content: player.tier.text,
                    align: useTierShiftImage ? "left" : "center",
                    font: `${Dimensions.FONT["OpenSans"].weight["bold"]} ${Dimensions.FONT["OpenSans"].size}px ${Dimensions.FONT["OpenSans"].family}`,
                    margin: [useTierShiftImage ? tierImageMarginX + this._dimensions.results.width.shift + tierSpaceWidth : 0, 0]
                }]
            });

            // add tier shift image
            if (tierShiftSymbol && "string" !== typeof tierShift && null !== tierShift) {
                this._image(`results_player_${index}_tier_image`, {
                    image: tierShift,
                    x: this._canvas.x + tierImageMarginX,
                    y: this._canvas.y + (this._dimensions.results.height.table_row / 2) - (this._dimensions.results.height.shift / 2),
                    width: this._dimensions.results.width.shift,
                    height: this._dimensions.results.height.shift,
                    margin: this._dimensions.results.margin.elements.value.tier,
                });
            }

            // shift the coords
            this._setOrigin(
                contentX,
                this._blocks["rating_updates_header"].y + this._blocks["rating_updates_header"].height + this._dimensions.results.margin.header[1],
            );
            this._addToOrigin(0, index * this._blocks[`results_player_${index}_row`].outerHeight);

            index++;
        }
    }

    /**
     * Draw a block
     *
     * @param {string} id
     * @param {Object} options
     * @private
     */
    _block(id, options) {
        const width = this._getValue(options, "width", 0);
        const height = this._getValue(options, "height", 0);
        const border = this._getValue(options, "border", null);
        const background = this._getValue(options, "background", this._colors.get("transparent"));
        const color = this._getValue(options, "color", this._colors.get("default"));
        const margin = this._getValue(options, "margin", [0, 0]);
        const textDirection = this._getValue(options, "text_direction", "row");
        const x = this._getValue(options, "x", 0) + parseInt(margin[0]);
        const y = this._getValue(options, "y", 0) + parseInt(margin[1]);
        const texts = [];

        if (options.text) {
            // calculate text heights
            let textDimensionsForHeight = null;
            let textWidth = 0;
            let textHeight = 0;
            const nbTexts = options.text.length;
            let textsWidth = 0;
            let textsHeight = 0;
            const columnSpacing = 22;
            const rowSpacing = 4;

            if (nbTexts > 1 && "column" === textDirection) {
                for (let [i, text] of options.text.entries()) {

                    if (text.font && text.font.startsWith("1000") && text.font.includes("Roboto")) {
                        text.font = text.font
                            .replace("1000", "900")
                            .replace("Roboto", "RobotoSlab")
                        ;
                    }

                    if (text.font) {
                        const currentFont = this._canvas.ctx.font;
                        this._canvas.ctx.font = text.font;
                        textDimensionsForHeight = this._canvas.ctx.measureText("O");
                        textHeight = textDimensionsForHeight.actualBoundingBoxAscent + textDimensionsForHeight.actualBoundingBoxDescent;
                        this._canvas.ctx.font = currentFont;
                    }
                    textsHeight += textHeight;
                }
                textsHeight += (columnSpacing * (nbTexts - 1));
            } else {
                textDimensionsForHeight = this._canvas.ctx.measureText("O");
                textHeight = textDimensionsForHeight.actualBoundingBoxAscent + textDimensionsForHeight.actualBoundingBoxDescent;
            }

            if (nbTexts > 1 && "row" === textDirection) {
                for (let [i, text] of options.text.entries()) {
                    if (text.font && text.font.startsWith("1000") && text.font.includes("Roboto")) {
                        text.font = text.font
                            .replace("1000", "900")
                            .replace("Roboto", "RobotoSlab")
                        ;
                    }

                    if (text.font) {
                        const currentFont = this._canvas.ctx.font;
                        this._canvas.ctx.font = text.font;
                        textWidth = this._canvas.ctx.measureText(text.content).width;
                        this._canvas.ctx.font = currentFont;
                    }
                    textsWidth += textWidth;
                }
                textsWidth += (rowSpacing * (nbTexts - 1));
            }

            // calculate texts dimensions
            for (let [i, text] of options.text.entries()) {
                const textMargin = this._getValue(text, "margin", [0, 0]);
                let textDimensionsForWidth = this._canvas.ctx.measureText(text.content);
                const align = this._getValue(text, "align", "center");
                const font = this._getValue(text, "font", null);

                if (text.font) {
                    if (text.font && text.font.startsWith("1000") && text.font.includes("Roboto")) {
                        text.font = text.font
                            .replace("1000", "900")
                            .replace("Roboto", "RobotoSlab")
                        ;
                    }

                    const originalFont = this._canvas.ctx.font;
                    this._canvas.ctx.font = text.font;
                    textDimensionsForHeight = this._canvas.ctx.measureText("O");
                    textHeight = textDimensionsForHeight.actualBoundingBoxAscent + textDimensionsForHeight.actualBoundingBoxDescent;
                    textDimensionsForWidth = this._canvas.ctx.measureText(text.content);
                    this._canvas.ctx.font = originalFont;
                }

                let textX = x;
                let textY = y;
                if (nbTexts > 1 && "column" === textDirection) {
                    textY = y + (height / 2) + (textHeight / 2) - (textsHeight / nbTexts / 2) + (i * (textHeight + columnSpacing)) + parseInt(textMargin[1]);
                } else {
                    textY = y + (height / 2) + (textHeight / 2) + parseInt(textMargin[1]);
                }
                switch (align) {
                    case "left":
                        textX += parseInt(textMargin[0]);
                        break;
                    case "right":
                        textX += width - textDimensionsForWidth.width + parseInt(textMargin[0]);
                        break;
                    case "center":
                    default:
                        textX += (width / 2) - (textDimensionsForWidth.width / 2) + parseInt(textMargin[0]);
                        break;
                }

                texts.push({
                    content: text.content, x: textX, y: textY, font, color: this._getValue(options, "color", color),
                });
            }
        }

        // box
        this._canvas.ctx.fillStyle = background;
        if (border) {
            this._fillRoundRect(x, y, width, height, 6, "round" === border ? null : border);
        } else {
            this._canvas.ctx.fillRect(x, y, width, height);
        }
        this._canvas.ctx.restore();

        // text
        if (texts) {
            for (let [key, text] of texts.entries()) {
                const originalFont = this._canvas.ctx.font;
                if (text.font) {
                    if (text.font.startsWith("1000") && text.font.includes("Roboto")) {
                        text.font = text.font
                            .replace("1000", "900")
                            .replace("Roboto", "RobotoSlab")
                        ;
                    }

                    this._canvas.ctx.font = text.font;
                }
                this._canvas.ctx.fillStyle = text.color;
                this._canvas.ctx.fillText(text.content, text.x, text.y);
                if (text.font) {
                    this._canvas.ctx.font = originalFont;
                }
                this._canvas.ctx.restore();
            }
        }

        this._blocks[id] = {x, y, width, height, outerWidth: width + margin[0], outerHeight: height + margin[1], border, background, color, margin, texts};
    }

    /**
     * Draw an image.
     * Image won't be auto-centered, (todo)
     * so set the correct x and y coords if the image needs to be centered inside a previously drawn block
     *
     * @param {string} id
     * @param {Object} options
     * @private
     */
    _image(id, options) {
        const width = this._getValue(options, "width", null);
        const height = this._getValue(options, "height", null);
        const margin = this._getValue(options, "margin", [0, 0]);
        const x = this._getValue(options, "x", 0) + parseInt(margin[0]);
        const y = this._getValue(options, "y", 0) + parseInt(margin[1]);
        const image = this._getValue(options, "image", null);
        const border = this._getValue(options, "border", null);

        if (null === image) {
            return;
        }

        const aspectRatio = image.width / image.height;
        let newWidth, newHeight;
        if (width && height) {
            newWidth = width;
            newHeight = height;
        } else if (width) {
            newWidth = width;
            newHeight = width / aspectRatio;
        } else if (height) {
            newWidth = height * aspectRatio;
            newHeight = height;
        } else {
            // If neither targetWidth nor targetHeight is specified, use the original size
            newWidth = image.width;
            newHeight = image.height;
        }

        // Draw the image on the canvas
        if ("round" === border) {
            const borderWidth = 2;
            const borderRadius = 4;

            this._canvas.ctx.save();

            this._canvas.ctx.beginPath();
            this._canvas.ctx.moveTo(x + borderRadius, y);
            this._canvas.ctx.arcTo(x + newWidth, y, x + newWidth, y + newHeight, borderRadius);
            this._canvas.ctx.arcTo(x + newWidth, y + newHeight, x, y + newHeight, borderRadius);
            this._canvas.ctx.arcTo(x, y + newHeight, x, y, borderRadius);
            this._canvas.ctx.arcTo(x, y, x + newWidth, y, borderRadius);
            this._canvas.ctx.closePath();
            this._canvas.ctx.clip();

            this._canvas.ctx.drawImage(image, x - borderWidth, y - borderWidth, newWidth + 2 * borderWidth, newHeight + 2 * borderWidth);
            this._canvas.ctx.strokeStyle = 'black';

            this._canvas.ctx.lineWidth = borderWidth * 2;
            this._canvas.ctx.stroke();

            this._canvas.ctx.restore();
        } else {
            this._canvas.ctx.drawImage(image, x, y, newWidth, newHeight);
        }

        this._blocks[id] = {image, x, y, width, height, outerWidth: width + margin[0], outerHeight: height + margin[1], margin, border};
    }

    /**
     * Draw a rectangle with rounded corners
     *
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {number} radius
     * @param options {{"top_left": boolean, "top_right": boolean, "bottom_left": boolean, "bottom_right": boolean} | null} border
     * @private
     */
    _fillRoundRect(x, y, width, height, radius, options = null) {
        this._canvas.ctx.beginPath();

        // if (!options) {
        if (!options) {
            this._canvas.ctx.moveTo(x + radius, y); // Move to top-left corner of the box
            this._canvas.ctx.lineTo(x + width - radius, y); // Draw top edge
            this._canvas.ctx.arcTo(x + width, y, x + width, y + radius, radius); // Top-right corner
            this._canvas.ctx.lineTo(x + width, y + height - radius); // Draw right edge
            this._canvas.ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius); // Bottom-right corner
            this._canvas.ctx.lineTo(x + radius, y + height); // Draw bottom edge
            this._canvas.ctx.arcTo(x, y + height, x, y + height - radius, radius); // Bottom-left corner
            this._canvas.ctx.lineTo(x, y + radius); // Draw left edge
            this._canvas.ctx.arcTo(x, y, x + radius, y, radius); // Top-left corner
        } else {
            if (options && options.top_left && options.top_right) {
                this._canvas.ctx.moveTo(x + radius, y); // Move to top-left corner of the box
                this._canvas.ctx.lineTo(x + width - radius, y); // Draw top edge
                this._canvas.ctx.arcTo(x + width, y, x + width, y + radius, radius); // Top-right corner
            } else if (options && options.top_left && !options.top_right) {
                this._canvas.ctx.moveTo(x + radius, y); // Move to top-left corner of the box
                this._canvas.ctx.lineTo(x + width, y); // Draw top edge
            } else if (options && !options.top_left && options.top_right) {
                this._canvas.ctx.moveTo(x, y); // Move to top-left corner of the box
                this._canvas.ctx.lineTo(x + width - radius, y); // Draw top edge
                this._canvas.ctx.arcTo(x + width, y, x + width, y + radius, radius); // Top-right corner
            } else if (options && !options.top_left && !options.top_right) {
                this._canvas.ctx.moveTo(x, y); // Move to top-left corner of the box
                this._canvas.ctx.lineTo(x + width, y); // Draw top edge
            }

            if (options && options.top_right && options.bottom_right) {
                this._canvas.ctx.lineTo(x + width, y + height - radius); // Draw right edge
                this._canvas.ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius); // Bottom-right corner
            } else if (options && options.top_right && !options.bottom_right) {
                this._canvas.ctx.lineTo(x + width, y + height); // Draw right edge
            } else if (options && !options.top_right && options.bottom_right) {
                this._canvas.ctx.lineTo(x + width, y + height - radius); // Draw right edge
                this._canvas.ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius); // Bottom-right corner
            } else if (options && !options.top_right && !options.bottom_right) {
                this._canvas.ctx.lineTo(x + width, y + height); // Draw right edge
            }

            if (options && options.bottom_right && options.bottom_left) {
                this._canvas.ctx.lineTo(x + radius, y + height); // Draw bottom edge
                this._canvas.ctx.arcTo(x, y + height, x, y + height - radius, radius); // Bottom-left corner
            } else if (options && options.bottom_right && !options.bottom_left) {
                this._canvas.ctx.lineTo(x, y + height); // Draw bottom edge
            } else if (options && !options.bottom_right && options.bottom_left) {
                this._canvas.ctx.lineTo(x + radius, y + height); // Draw bottom edge
                this._canvas.ctx.arcTo(x, y + height, x, y + height - radius, radius); // Bottom-left corner
            } else if (options && !options.bottom_right && !options.bottom_left) {
                this._canvas.ctx.lineTo(x, y + height); // Draw bottom edge
            }

            if (options && options.bottom_left && options.top_left) {
                this._canvas.ctx.lineTo(x, y + radius); // Draw left edge
                this._canvas.ctx.arcTo(x, y, x + radius, y, radius); // Top-left corner
            } else if (options && options.bottom_left && !options.top_left) {
                this._canvas.ctx.lineTo(x, y); // Draw left edge
            } else if (options && !options.bottom_left && options.top_left) {
                this._canvas.ctx.lineTo(x, y + radius); // Draw left edge
                this._canvas.ctx.arcTo(x, y, x + radius, y, radius); // Top-left corner
            } else if (options && !options.bottom_left && !options.top_left) {
                this._canvas.ctx.lineTo(x, y); // Draw left edge
            }
        }
        this._canvas.ctx.closePath();
        this._canvas.ctx.fill();
    }

    /**
     * Get value from options
     *
     * @param options
     * @param name
     * @param defaultValue
     *
     * @returns {*}
     * @private
     */
    _getValue(options, name, defaultValue) {
        return "undefined" !== options[name] && options[name] ? options[name] : defaultValue;
    }

    /**
     * Update current canvas' x and y coordinates
     *
     * @param {number} x
     * @param {number} y
     * @private
     */
    _setOrigin(x, y) {
        this._canvas.x = x;
        this._canvas.y = y;
    }

    /**
     * Add to current canvas' x and y coordinates
     *
     * @param {number} x
     * @param {number} y
     * @private
     */
    _addToOrigin(x, y) {
        this._canvas.x += x;
        this._canvas.y += y;
    }
}

module.exports = CanvasRenderer;
