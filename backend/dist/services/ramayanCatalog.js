"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAMAYAN_LEGACY_IDS = void 0;
exports.isLegacyRamayan = isLegacyRamayan;
exports.preferRamayanText = preferRamayanText;
const bookLayoutService_1 = require("./bookLayoutService");
// Preserve the public detail URL of the former separate collection. Edition,
// passage, plan and reader URLs retain their original IDs during consolidation.
exports.RAMAYAN_LEGACY_IDS = ['7ef9d10a-ac5f-460b-8bf7-b08d1cb6469a'];
function isLegacyRamayan(id) {
    return exports.RAMAYAN_LEGACY_IDS.includes(id);
}
function preferRamayanText(editions) {
    return [...editions].sort((a, b) => Number(b.source === bookLayoutService_1.RAMAYAN_SOURCE) - Number(a.source === bookLayoutService_1.RAMAYAN_SOURCE));
}
//# sourceMappingURL=ramayanCatalog.js.map