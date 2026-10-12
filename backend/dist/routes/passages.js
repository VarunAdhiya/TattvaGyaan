"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passageController_1 = require("../controllers/passageController");
const scriptureController_1 = require("../controllers/scriptureController");
const validate_1 = require("../middleware/validate");
const scriptureSchema_1 = require("../validators/scriptureSchema");
const router = (0, express_1.Router)();
router.get('/edition/:editionId', scriptureController_1.scriptureController.getReaderContent);
router.get('/section/:sectionId', (0, validate_1.validate)(scriptureSchema_1.paginationSchema, 'query'), passageController_1.passageController.getBySection);
router.get('/:id/position', passageController_1.passageController.getPosition);
router.get('/:id', passageController_1.passageController.getOne);
exports.default = router;
//# sourceMappingURL=passages.js.map