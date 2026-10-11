"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passageController_1 = require("../controllers/passageController");
const scriptureController_1 = require("../controllers/scriptureController");
const router = (0, express_1.Router)();
router.get('/edition/:editionId', scriptureController_1.scriptureController.getReaderContent);
router.get('/section/:sectionId', passageController_1.passageController.getBySection);
router.get('/:id', passageController_1.passageController.getOne);
exports.default = router;
//# sourceMappingURL=passages.js.map