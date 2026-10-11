"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const searchController_1 = require("../controllers/searchController");
const router = (0, express_1.Router)();
router.get('/', searchController_1.searchController.search);
router.get('/scriptures', searchController_1.searchController.searchScriptures);
exports.default = router;
//# sourceMappingURL=search.js.map