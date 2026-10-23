import { Router } from 'express';
import { aiController } from '../controllers/aiController';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { explainSchema, askQuestionSchema, summarizeSchema, libraryQuestionSchema } from '../validators/aiSchema';
import { libraryAiController } from '../controllers/libraryAiController';

const router = Router();

router.use(requireAuth);
router.get('/library/catalog', libraryAiController.catalog);
router.get('/library/history', libraryAiController.history);
router.delete('/library/history', libraryAiController.clearHistory);
router.post('/library/ask', validate(libraryQuestionSchema), libraryAiController.ask);

router.post('/explain', validate(explainSchema), aiController.explain);
router.post('/summarize', validate(summarizeSchema), aiController.summarize);
router.post('/chat', validate(askQuestionSchema), aiController.chat);
router.get('/conversations', aiController.getConversations);
router.get('/conversations/:id', aiController.getConversation);
router.delete('/conversations/:id', aiController.deleteConversation);

export default router;
