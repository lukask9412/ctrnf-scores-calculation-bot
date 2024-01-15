const {createCanvas, registerFont} = require('canvas');
const path = require("path");

class TableCanvas {
    get canvas() {
        return this._canvas;
    }

    constructor(dimensions) {
        if (dimensions.font.path.hasOwnProperty("regular")) {
            registerFont(dimensions.font.path["regular"], {family: dimensions.font.family, weight: dimensions.font.weight["regular"]});
        }
        if (dimensions.font.path.hasOwnProperty("medium")) {
            registerFont(dimensions.font.path["medium"], {family: dimensions.font.family, weight: dimensions.font.weight["medium"]});
        }
        if (dimensions.font.path.hasOwnProperty("bold")) {
            registerFont(dimensions.font.path["bold"], {family: dimensions.font.family, weight: dimensions.font.weight["bold"]});
        }
        if (dimensions.font.path.hasOwnProperty("extraBold")) {
            registerFont(dimensions.font.path["extraBold"], {family: dimensions.font.family, weight: dimensions.font.weight["extraBold"]});
        }
        if (dimensions.font.path.hasOwnProperty("black")) {
            registerFont(dimensions.font.path["black"], {family: dimensions.font.family, weight: dimensions.font.weight["black"]});
        }
        if (dimensions.font.path.hasOwnProperty("extra")) {
            registerFont(dimensions.font.path["extra"], {family: dimensions.font.family + "Slab", weight: "900"});
        }

        this._canvas = {
            x: 0,
            y: 0,
            obj: null,
            ctx: null
        };
        this._canvas.obj = createCanvas(
            dimensions.canvas.margin.x + dimensions.canvas.width + dimensions.canvas.margin.x,
            dimensions.canvas.margin.y + dimensions.canvas.height + dimensions.canvas.margin.y
        );
        this._canvas.ctx = this._canvas.obj.getContext('2d', {alpha: false});
        this._canvas.ctx.font = `${dimensions.font.weight["medium"]} ${dimensions.font.size}px ${dimensions.font.family}`;
        this._canvas.ctx.save();
    }
}

module.exports = TableCanvas;
