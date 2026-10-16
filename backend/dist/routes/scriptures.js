"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scriptureController_1 = require("../controllers/scriptureController");
const validate_1 = require("../middleware/validate");
const scriptureSchema_1 = require("../validators/scriptureSchema");
const router = (0, express_1.Router)();
router.get('/', (0, validate_1.validate)(scriptureSchema_1.scriptureFilterSchema, 'query'), scriptureController_1.scriptureController.getAll);
router.get('/:scriptureId/editions', scriptureController_1.scriptureController.getEditions);
router.get('/:id', scriptureController_1.scriptureController.getOne);
exports.default = router;
//# sourceMappingURL=scriptures.js.map