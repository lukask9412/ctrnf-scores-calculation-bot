class Colors {
    static _COLORS = {
        transparent: 'rgba(0,0,0,0)',
        default: 'rgb(30,30,30)',
        black: 'rgb(0,0,0)',
        white: 'rgb(255,255,255)',
        light: '#f5f5f5',
        dark: '#949494',
        delta: {
            default: 'rgb(138,138,138)',
            positive: 'rgb(8,173,13)',
            negative: 'rgb(255,0,0)'
        },
        team: [
            "#ffe619",
            "#22c5f6",
            "#7ffa2c",
            "#fd0f0f",
        ]
    }

    constructor() {
        Colors._COLORS.team = Colors._COLORS.team.reduce(([a, b]) => (b.push(...a.splice(Math.random() * a.length | 0, 1)), [a, b]), [[...Colors._COLORS.team], []])[1]
    }

    /**
     * Get a color
     *
     * @param {string} color
     * @returns {string}
     */
    get(color) {
        if (Colors._COLORS.hasOwnProperty(color)) {
            return Colors._COLORS[color];
        }
        return Colors._COLORS["default"];
    }

    /**
     * Converts a HEX color string to an RGBA color string
     *
     * @param {string} hex
     * @param {number} alpha
     * @returns {string}
     */
    hexToRGBA(hex, alpha = 1) {
        hex = hex.replace('#', '');

        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }

        // Parse the hex values for red, green, and blue
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // Ensure the alpha value is between 0 and 1
        alpha = Math.min(1, Math.max(0, alpha));

        // Create the RGBA color
        const rgba = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        return rgba;
    }

    /**
     * Generate a slightly brighter color based on the provided color.
     *
     * @param {string} color
     * @param {number} brightnessFactor
     * @returns {string}
     */
    generateSimilarColor(color, brightnessFactor = 1.3) {
        const rgbaMatch = color.match(/rgba?\((\d+), (\d+), (\d+)(, (\d+(\.\d+)?))?\)/);

        if (rgbaMatch) {
            const red = parseInt(rgbaMatch[1]);
            const green = parseInt(rgbaMatch[2]);
            const blue = parseInt(rgbaMatch[3]);
            const alpha = rgbaMatch[5] ? parseFloat(rgbaMatch[5]) : 1;

            const newRed = Math.min(255, Math.round(red * brightnessFactor));
            const newGreen = Math.min(255, Math.round(green * brightnessFactor));
            const newBlue = Math.min(255, Math.round(blue * brightnessFactor));

            if (alpha < 1) {
                return `rgba(${newRed}, ${newGreen}, ${newBlue}, ${alpha})`;
            } else {
                return `rgb(${newRed}, ${newGreen}, ${newBlue})`;
            }
        }

        return color;
    }

    /**
     * Generates a text color for a background.
     * @param {string} color
     * @returns {string}
     */
    generateTextColorForBackground(color) {
        const rgbaMatch = color.match(/rgba?\((\d+), (\d+), (\d+)(, (\d+(\.\d+)?))?\)/);

        if (rgbaMatch) {
            const red = parseInt(rgbaMatch[1]);
            const green = parseInt(rgbaMatch[2]);
            const blue = parseInt(rgbaMatch[3]);
            const alpha = rgbaMatch[5] ? parseFloat(rgbaMatch[5]) : 1;

            // Calculate the relative luminance of the color
            const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

            // Determine whether to use black or white text based on luminance
            if (luminance > 128 * alpha) {
                return "black";
            } else {
                return "white";
            }
        }
        return "black)";
    }

    /**
     * Get team color
     *
     * @param teamNumber
     * @param teamColor
     * @param nbTeams
     * @returns {*|string}
     */
    getTeamColor(teamNumber, teamColor = null, nbTeams = null) {
        if (teamColor && teamColor.startsWith("#")) {
            const colorSimilarities = this.getColorSimilarity(teamColor);
            if (colorSimilarities.white < 0.02) {
                const isLastTeam = nbTeams && teamNumber + 1 === nbTeams;
                if (isLastTeam) {
                    teamColor = Colors._COLORS.light;
                }
            } else if (colorSimilarities.black < 0.1) {
                teamColor = Colors._COLORS.dark;
            }

            return teamColor;
        }

        for (let [i, color] of Colors._COLORS.team.entries()) {
            if (teamNumber === i) {
                return color;
            }
        }

        return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
    }

    /**
     * Get similarity of the HEX color to black and white
     *
     * @param {string} hexColor
     * @returns {{white: number, black: number}}
     */
    getColorSimilarity(hexColor) {
        // Remove the '#' if it exists
        hexColor = hexColor.replace(/^#/, '');

        if (hexColor.length === 3) {
            hexColor = hexColor.split('').map(char => char + char).join('');
        }

        // Convert hex to RGB
        const r = parseInt(hexColor.slice(0, 2), 16);
        const g = parseInt(hexColor.slice(2, 4), 16);
        const b = parseInt(hexColor.slice(4, 6), 16);

        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Calculate similarity to white and black
        const white = Math.abs(1 - luminance);
        const black = luminance;

        return {
            white,
            black
        };
    }

    lightenColor(hexColor, factor = 0.2) {
        // Remove the '#' if it exists
        hexColor = hexColor.replace(/^#/, '');

        if (hexColor.length === 3) {
            hexColor = hexColor.split('').map(char => char + char).join('');
        }

        // Convert hex to RGB
        let r = parseInt(hexColor.slice(0, 2), 16);
        let g = parseInt(hexColor.slice(2, 4), 16);
        let b = parseInt(hexColor.slice(4, 6), 16);

        // Convert RGB to HSL
        let hsl = this.rgbToHsl(r, g, b);

        // Adjust lightness
        hsl[2] = Math.min(1, hsl[2] + factor);

        // Convert HSL back to RGB
        const lightenedColor = this.hslToRgb(hsl[0], hsl[1], hsl[2]);

        // Convert RGB back to hex
        const lightenedHex = `#${lightenedColor[0].toString(16).padStart(2, '0')}${lightenedColor[1].toString(16).padStart(2, '0')}${lightenedColor[2].toString(16).padStart(2, '0')}`;

        return lightenedHex;
    }

    darkenColor(hexColor, factor = 0.2) {
        // Remove the '#' if it exists
        hexColor = hexColor.replace(/^#/, '');

        if (hexColor.length === 3) {
            hexColor = hexColor.split('').map(char => char + char).join('');
        }

        // Convert hex to RGB
        let r = parseInt(hexColor.slice(0, 2), 16);
        let g = parseInt(hexColor.slice(2, 4), 16);
        let b = parseInt(hexColor.slice(4, 6), 16);

        // Convert RGB to HSL
        let hsl = this.rgbToHsl(r, g, b);

        // Adjust lightness
        hsl[2] = Math.max(0, hsl[2] - factor);

        // Convert HSL back to RGB
        const darkenedColor = this.hslToRgb(hsl[0], hsl[1], hsl[2]);

        // Convert RGB back to hex
        const darkenedHex = `#${darkenedColor[0].toString(16).padStart(2, '0')}${darkenedColor[1].toString(16).padStart(2, '0')}${darkenedColor[2].toString(16).padStart(2, '0')}`;

        return darkenedHex;
    }

    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }

            h /= 6;
        }

        return [h, s, l];
    }

    hslToRgb(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;

            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
}

module.exports = Colors;
