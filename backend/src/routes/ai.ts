import { Router } from 'express';
import { aiController } from '../controllers/aiController';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { explainSchema, askQuestionSchema, summarizeSchema } from '../validators/aiSchema';
import rateLimit from 'express-rate-limit';
import { config } from '../config';

const aiLimiter = rateLimit({
  windowMs: config.aiRateLimit.windowMs,
  max: config.aiRateLimit.max,
  skip: (req) => config.nodeEnv !== 'production' || req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
  message: { error: 'Too many AI requests. Please try again later.' },
});

const router = Router();

router.use(requireAuth);
router.use(aiLimiter);

router.post('/explain', validate(explainSchema), aiController.explain);
router.post('/summarize', validate(summarizeSchema), aiController.summarize);
router.post('/chat', validate(askQuestionSchema), aiController.chat);
router.get('/conversations', aiController.getConversations);
router.get('/conversations/:id', aiController.getConversation);
router.delete('/conversations/:id', aiController.deleteConversation);

export default router;