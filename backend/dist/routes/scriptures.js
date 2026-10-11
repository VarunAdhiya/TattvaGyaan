"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scriptureController_1 = require("../controllers/scriptureController");
const router = (0, express_1.Router)();
router.get('/', scriptureController_1.scriptureController.getAll);
router.get('/:scriptureId/editions', scriptureController_1.scriptureController.getEditions);
router.get('/:id', scriptureController_1.scriptureController.getOne);
exports.default = router;
//# sourceMappingURL=scriptures.js.map