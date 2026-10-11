"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const highlightController_1 = require("../controllers/highlightController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/edition/:editionId', auth_1.requireAuth, highlightController_1.highlightController.getByEdition);
router.post('/', auth_1.requireAuth, highlightController_1.highlightController.create);
router.delete('/:id', auth_1.requireAuth, highlightController_1.highlightController.delete);
exports.default = router;
//# sourceMappingURL=highlights.js.map