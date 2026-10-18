import { Router } from 'express';
import { listDevotionals, getDevotional, getCalendarMonth } from '../services/devotionalService';
import { devotionalFilterSchema, devotionalParamsSchema, calendarMonthSchema } from '../validators/devotionalSchema';

const router = Router();
router.get('/', async (req, res, next) => {
  try { res.json(await listDevotionals(devotionalFilterSchema.parse(req.query))); } catch (error) { next(error); }
});
router.get('/calendar', async (req, res, next) => {
  try {
    const { year, month } = calendarMonthSchema.parse(req.query);
    res.json(await getCalendarMonth(year, month));
  } catch (error) { next(error); }
});
router.get('/:category/:slug', async (req, res, next) => {
  try {
    const { category, slug } = devotionalParamsSchema.parse(req.params);
    res.json(await getDevotional(category, slug));
  } catch (error) { next(error); }
});
export default router;
