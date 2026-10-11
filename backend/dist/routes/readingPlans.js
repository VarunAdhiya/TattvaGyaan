"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const readingPlanController_1 = require("../controllers/readingPlanController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const readingPlanSchema_1 = require("../validators/readingPlanSchema");
const router = (0, express_1.Router)();
router.get('/', auth_1.requireAuth, readingPlanController_1.readingPlanController.getAll);
router.post('/', auth_1.requireAuth, (0, validate_1.validate)(readingPlanSchema_1.createReadingPlanSchema), readingPlanController_1.readingPlanController.create);
router.get('/:id', auth_1.requireAuth, readingPlanController_1.readingPlanController.getOne);
router.patch('/:id', auth_1.requireAuth, (0, validate_1.validate)(readingPlanSchema_1.updateReadingPlanSchema), readingPlanController_1.readingPlanController.update);
router.delete('/:id', auth_1.requireAuth, readingPlanController_1.readingPlanController.delete);
router.patch('/items/:itemId/complete', auth_1.requireAuth, (0, validate_1.validate)(readingPlanSchema_1.completePlanItemSchema), readingPlanController_1.readingPlanController.completeItem);
exports.default = router;
//# sourceMappingURL=readingPlans.js.map