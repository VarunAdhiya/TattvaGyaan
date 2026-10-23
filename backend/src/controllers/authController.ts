import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { AuthRequest } from '../middleware/auth';
import { createUserSession } from '../services/sessionService';
import { googleAuthService } from '../services/googleAuthService';
import { AppError } from '../middleware/errorHandler';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body);
      await createUserSession(req, user.id);
      res.status(201).json({ user });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.login(req.body.email, req.body.password);
      if (req.body.connectGoogle) {
        if (!req.session.googleLink) throw new AppError('Start Google sign-in again before connecting your account.', 401);
        await googleAuthService.link(user.id, req.session.googleLink);
      }
      await createUserSession(req, user.id);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.clearCookie('tattva.sid');
      res.json({ message: 'Logged out successfully' });
    });
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await authService.getProfile(req.userId!);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await authService.updateProfile(req.userId!, req.body);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }

  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return res.json({ user: null });
      }
      const user = await authService.getProfile(req.userId);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
