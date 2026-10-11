import { Router } from 'express';
import { authController } from '../controllers/authController';
import { validate } from '../middleware/validate';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { registerSchema, loginSchema, updateProfileSchema } from '../validators/authSchema';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', optionalAuth, authController.me);
router.get('/profile', requireAuth, authController.getProfile);
router.patch('/profile', requireAuth, validate(updateProfileSchema), authController.updateProfile);

export default router;