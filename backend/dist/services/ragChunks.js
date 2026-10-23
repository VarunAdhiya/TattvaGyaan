"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourceHash = void 0;
exports.splitPassage = splitPassage;
const node_crypto_1 = require("node:crypto");
const sourceHash = (text) => (0, node_crypto_1.createHash)('md5').update(text).digest('hex');
exports.sourceHash = sourceHash;
// Preserve exact source substrings and offsets. Never normalize/rewrite scripture.
function splitPassage(text, size = 600, overlap = 80) {
    if (size < 100 || overlap < 0 || overlap >= size)
        throw new Error('Invalid chunk bounds');
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        let end = Math.min(start + size, text.length);
        if (end < text.length) {
            const boundary = text.lastIndexOf(' ', end);
            if (boundary > start + size / 2)
                end = boundary;
            if (/[\uD800-\uDBFF]/.test(text[end - 1]))
                end--;
        }
        if (text.slice(start, end).trim())
            chunks.push({ text: text.slice(start, end), start, end });
        if (end === text.length)
            break;
        const next = Math.max(start + 1, end - overlap);
        const boundary = text.indexOf(' ', next);
        start = boundary >= next && boundary < end ? boundary + 1 : end;
    }
    return chunks;
}
//# sourceMappingURL=ragChunks.js.map