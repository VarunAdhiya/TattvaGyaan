"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scriptureController_1 = require("../controllers/scriptureController");
const router = (0, express_1.Router)();
router.get('/:id', scriptureController_1.scriptureController.getEdition);
exports.default = router;
//# sourceMappingURL=editions.js.map