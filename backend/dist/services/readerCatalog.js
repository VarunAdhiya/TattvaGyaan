"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readerEditionWhere = exports.readerSlugs = void 0;
exports.assertReaderEdition = assertReaderEdition;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const errorHandler_1 = require("../middleware/errorHandler");
const editions = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.resolve)(__dirname, '../../data/reader-editions.json'), 'utf8'));
exports.readerSlugs = editions.map(edition => edition.scriptureSlug);
exports.readerEditionWhere = {
    language: 'hi',
    OR: editions.map(edition => ({ source: edition.source, contentStatus: edition.contentStatus, scripture: { slug: edition.scriptureSlug } })),
};
function assertReaderEdition(edition) {
    if (edition.language !== 'hi' || !editions.some(item => item.source === edition.source)) {
        throw new errorHandler_1.AppError('Edition not found', 404);
    }
}
//# sourceMappingURL=readerCatalog.js.map