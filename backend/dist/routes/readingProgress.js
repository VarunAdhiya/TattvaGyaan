"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const readingProgressController_1 = require("../controllers/readingProgressController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.requireAuth, readingProgressController_1.readingProgressController.get);
router.get('/:editionId', auth_1.requireAuth, readingProgressController_1.readingProgressController.getByEdition);
router.post('/', auth_1.requireAuth, readingProgressController_1.readingProgressController.upsert);
exports.default = router;
//# sourceMappingURL=readingProgress.js.map