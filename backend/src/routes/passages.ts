import { Router } from 'express';
import { passageController } from '../controllers/passageController';
import { scriptureController } from '../controllers/scriptureController';

const router = Router();

router.get('/edition/:editionId', scriptureController.getReaderContent);
router.get('/section/:sectionId', passageController.getBySection);
router.get('/:id', passageController.getOne);

export default router;