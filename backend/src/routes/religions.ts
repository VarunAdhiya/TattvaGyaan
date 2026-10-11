import { Router } from 'express';
import { religionController } from '../controllers/religionController';

const router = Router();

router.get('/', religionController.getAll);
router.get('/:id', religionController.getOne);

export default router;