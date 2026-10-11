import { Router } from 'express';
import { bookmarkController } from '../controllers/bookmarkController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, bookmarkController.getAll);
router.post('/', requireAuth, bookmarkController.create);
router.delete('/:id', requireAuth, bookmarkController.delete);

export default router;