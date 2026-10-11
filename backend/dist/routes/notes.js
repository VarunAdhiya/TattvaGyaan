"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const noteController_1 = require("../controllers/noteController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.requireAuth, noteController_1.noteController.getAll);
router.post('/', auth_1.requireAuth, noteController_1.noteController.create);
router.patch('/:id', auth_1.requireAuth, noteController_1.noteController.update);
router.delete('/:id', auth_1.requireAuth, noteController_1.noteController.delete);
exports.default = router;
//# sourceMappingURL=notes.js.map