import { Router } from 'express';
import { readingPlanController } from '../controllers/readingPlanController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', readingPlanController.getUserPlans.bind(readingPlanController));
router.post('/', readingPlanController.createPlan.bind(readingPlanController));
router.get('/:id', readingPlanController.getPlan.bind(readingPlanController));
router.patch('/:id', readingPlanController.updatePlan.bind(readingPlanController));
router.delete('/:id', readingPlanController.deletePlan.bind(readingPlanController));
router.patch('/items/:itemId/complete', readingPlanController.completePlanItem.bind(readingPlanController));

export default router;
