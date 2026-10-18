"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPESET_SOURCES = exports.RAMAYAN_SOURCE = exports.MANUSMRITI_SOURCE = exports.GARUDA_SOURCE = void 0;
exports.bookReadingBlocks = bookReadingBlocks;
exports.chapterContext = chapterContext;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_crypto_1 = require("node:crypto");
const errorHandler_1 = require("../middleware/errorHandler");
exports.GARUDA_SOURCE = 'urn:sha256:c05368e6b60c64f58b2b86b8a9375d483259cd81d6b2469faaafb4a698a6dcb0';
exports.MANUSMRITI_SOURCE = 'urn:sha256:992c71ecb2a16913c2fb578ae51f3a73d6288109f133b10b811d1b976f8698e3';
exports.RAMAYAN_SOURCE = 'urn:sha256:759f2adbfd2fc1191ff8576401d1cbc34bbfefaf79a573e8747c53d4c858af75';
exports.TYPESET_SOURCES = [exports.GARUDA_SOURCE, exports.MANUSMRITI_SOURCE, exports.RAMAYAN_SOURCE, 'urn:sha256:eb00713009dd7b6a81feec459c7518a494f851dc79d77e5d67856e4d8d70d809'];
const layoutFiles = { [exports.GARUDA_SOURCE]: 'garuda-purana.json', [exports.MANUSMRITI_SOURCE]: 'manusmriti.json', [exports.RAMAYAN_SOURCE]: 'ramayan-study.json' };
const layouts = new Map();
function bookReadingBlocks(source, slug, passages) {
    if (!source || !layoutFiles[source])
        return undefined;
    if (!layouts.has(source))
        layouts.set(source, JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.resolve)(__dirname, '../../data/layouts', layoutFiles[source]), 'utf8')));
    const layout = layouts.get(source);
    const section = layout.sections[slug];
    if (layout.source !== source || !section || passages.length !== Object.keys(section.hashes).length ||
        passages.some(passage => (0, node_crypto_1.createHash)('sha256').update(passage.text).digest('hex') !== section.hashes[passage.reference])) {
        throw new errorHandler_1.AppError('Source text differs from its reading layout. Please rebuild and verify the layout before reading.', 409);
    }
    return section.blocks;
}
function chapterContext(source, section, chapterKey) {
    if (!chapterKey)
        return { title: section.title, passages: section.passages };
    const blocks = bookReadingBlocks(source, section.slug, section.passages);
    const first = blocks?.findIndex(block => block.chapterKey === chapterKey) ?? -1;
    if (!blocks || first < 0)
        throw new errorHandler_1.AppError('Chapter does not belong to this source section', 400);
    let end = first + 1;
    while (end < blocks.length && blocks[end].kind !== 'chapter')
        end += 1;
    const byReference = new Map(section.passages.map(passage => [passage.reference, passage]));
    return { title: blocks[first].title || section.title, passages: blocks.slice(first, end).map(block => ({
            reference: [...new Set(block.parts.map(part => part.reference))].join(', '),
            text: block.parts.map((part, index) => (index && block.parts[index - 1].reference !== part.reference ? '\n' : '') +
                byReference.get(part.reference).text.slice(part.start, part.end)).join(''),
        })) };
}
//# sourceMappingURL=bookLayoutService.js.map