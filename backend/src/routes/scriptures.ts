import { Router } from 'express';
import { scriptureController } from '../controllers/scriptureController';

const router = Router();

router.get('/', scriptureController.getAll);
router.get('/:scriptureId/editions', scriptureController.getEditions);
router.get('/:id', scriptureController.getOne);

export default router;