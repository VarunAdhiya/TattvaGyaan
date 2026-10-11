"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const readingPlanController_1 = require("../controllers/readingPlanController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.get('/', readingPlanController_1.readingPlanController.getUserPlans.bind(readingPlanController_1.readingPlanController));
router.post('/', readingPlanController_1.readingPlanController.createPlan.bind(readingPlanController_1.readingPlanController));
router.get('/:id', readingPlanController_1.readingPlanController.getPlan.bind(readingPlanController_1.readingPlanController));
router.patch('/:id', readingPlanController_1.readingPlanController.updatePlan.bind(readingPlanController_1.readingPlanController));
router.delete('/:id', readingPlanController_1.readingPlanController.deletePlan.bind(readingPlanController_1.readingPlanController));
router.patch('/items/:itemId/complete', readingPlanController_1.readingPlanController.completePlanItem.bind(readingPlanController_1.readingPlanController));
exports.default = router;
//# sourceMappingURL=readingPlans.js.map