"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookmarkController_1 = require("../controllers/bookmarkController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.requireAuth, bookmarkController_1.bookmarkController.getAll);
router.post('/', auth_1.requireAuth, bookmarkController_1.bookmarkController.create);
router.delete('/:id', auth_1.requireAuth, bookmarkController_1.bookmarkController.delete);
exports.default = router;
//# sourceMappingURL=bookmarks.js.map