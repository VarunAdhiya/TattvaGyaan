import { Router } from 'express';
import { noteController } from '../controllers/noteController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, noteController.getAll);
router.post('/', requireAuth, noteController.create);
router.patch('/:id', requireAuth, noteController.update);
router.delete('/:id', requireAuth, noteController.delete);

export default router;