import { Router } from 'express';
import { readingProgressController } from '../controllers/readingProgressController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, readingProgressController.get);
router.get('/:editionId', requireAuth, readingProgressController.getByEdition);
router.post('/', requireAuth, readingProgressController.upsert);

export default router;