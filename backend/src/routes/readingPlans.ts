import { Router } from 'express';
import { readingPlanController } from '../controllers/readingPlanController';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createReadingPlanSchema, updateReadingPlanSchema, completePlanItemSchema } from '../validators/readingPlanSchema';

const router = Router();

router.get('/', requireAuth, readingPlanController.getAll);
router.post('/', requireAuth, validate(createReadingPlanSchema), readingPlanController.create);
router.get('/:id', requireAuth, readingPlanController.getOne);
router.patch('/:id', requireAuth, validate(updateReadingPlanSchema), readingPlanController.update);
router.delete('/:id', requireAuth, readingPlanController.delete);
router.patch('/items/:itemId/complete', requireAuth, validate(completePlanItemSchema), readingPlanController.completeItem);

export default router;