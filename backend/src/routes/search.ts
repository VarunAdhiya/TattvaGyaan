import { Router } from 'express';
import { searchController } from '../controllers/searchController';

const router = Router();

router.get('/', searchController.search);
router.get('/scriptures', searchController.searchScriptures);

export default router;