"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const religionController_1 = require("../controllers/religionController");
const router = (0, express_1.Router)();
router.get('/', religionController_1.religionController.getAll);
router.get('/:id', religionController_1.religionController.getOne);
exports.default = router;
//# sourceMappingURL=religions.js.map