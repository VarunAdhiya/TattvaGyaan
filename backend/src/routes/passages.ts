import { Router } from 'express';
import { passageController } from '../controllers/passageController';
import { scriptureController } from '../controllers/scriptureController';
import { validate } from '../middleware/validate';
import { paginationSchema } from '../validators/scriptureSchema';

const router = Router();

router.get('/edition/:editionId', scriptureController.getReaderContent);
router.get('/section/:sectionId', validate(paginationSchema, 'query'), passageController.getBySection);
router.get('/:id/position', passageController.getPosition);
router.get('/:id', passageController.getOne);

export default router;
