import { ABLETON_COLOR_PALETTE } from './constants.js';

/**
 * Sanitizes a string for safe inclusion in XML by escaping special characters.
 * @param {string} str The string to sanitize.
 * @returns {string} The sanitized string.
 */
export function sanitizeXml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
}

/**
 * Converts a hex color string to an RGB object.
 * @param {string} hex The hex color string (e.g., "#RRGGBB").
 * @returns {{r: number, g: number, b: number}|null} An object with r, g, b properties or null if invalid.
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Calculates the Euclidean distance between two RGB colors.
 * @param {{r: number, g: number, b: number}} rgb1 The first color.
 * @param {{r: number, g: number, b: number}} rgb2 The second color.
 * @returns {number} The distance between the colors.
 */
function colorDistance(rgb1, rgb2) {
    return Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
    );
}

/**
 * Finds the closest Ableton ColorIndex for a given hex color.
 * @param {string} hexColor The user-selected hex color.
 * @returns {number} The closest matching Ableton ColorIndex.
 */
export function findClosestAbletonColorIndex(hexColor) {
    const userRgb = hexToRgb(hexColor);
    if (!userRgb) return 0; // Default to gray if input is invalid

    let closestIndex = 0;
    let minDistance = Infinity;

    for (const [index, abletonHex] of Object.entries(ABLETON_COLOR_PALETTE)) {
        const abletonRgb = hexToRgb(abletonHex);
        const distance = colorDistance(userRgb, abletonRgb);
        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
        }
    }
    return parseInt(closestIndex, 10);
}
