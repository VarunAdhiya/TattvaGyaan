import { Router } from 'express';
import { scriptureController } from '../controllers/scriptureController';

const router = Router();

router.get('/:id', scriptureController.getEdition);

export default router;