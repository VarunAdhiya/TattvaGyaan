import { Router } from 'express';
import { scriptureController } from '../controllers/scriptureController';
import { validate } from '../middleware/validate';
import { scriptureFilterSchema } from '../validators/scriptureSchema';

const router = Router();

router.get('/', validate(scriptureFilterSchema, 'query'), scriptureController.getAll);
router.get('/:scriptureId/editions', scriptureController.getEditions);
router.get('/:id', scriptureController.getOne);

export default router;
