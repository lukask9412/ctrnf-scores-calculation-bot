const {createCanvas, registerFont} = require('canvas');
const path = require("path");

class MeasurementCanvas {
    get canvas() {
        return this._canvas;
    }

    constructor(font) {
        if (font.path.hasOwnProperty("regular")) {
            registerFont(font.path["regular"], {family: font.family, weight: font.weight["regular"]});
        }
        if (font.path.hasOwnProperty("medium")) {
            registerFont(font.path["medium"], {family: font.family, weight: font.weight["medium"]});
        }
        if (font.path.hasOwnProperty("bold")) {
            registerFont(font.path["bold"], {family: font.family, weight: font.weight["bold"]});
        }
        if (font.path.hasOwnProperty("extraBold")) {
            registerFont(font.path["extraBold"], {family: font.family, weight: font.weight["extraBold"]});
        }
        if (font.path.hasOwnProperty("black")) {
            registerFont(font.path["black"], {family: font.family, weight: font.weight["black"]});
        }
        if (font.path.hasOwnProperty("extra")) {
            registerFont(font.path["extra"], {family: font.family + "Slab", weight: "900"});
        }

        this._canvas = {
            x: 0,
            y: 0,
            obj: null,
            ctx: null
        };
        this._canvas.obj = createCanvas(0, 0);
        this._canvas.ctx = this._canvas.obj.getContext('2d', {alpha: false});
        this._canvas.ctx.font = `${font.weight["medium"]} ${font.size}px ${font.family}`;
    }
}

module.exports = MeasurementCanvas;
