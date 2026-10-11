import { Router } from 'express';
import { highlightController } from '../controllers/highlightController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/edition/:editionId', requireAuth, highlightController.getByEdition);
router.post('/', requireAuth, highlightController.create);
router.delete('/:id', requireAuth, highlightController.delete);

export default router;