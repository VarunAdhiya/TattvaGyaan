import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.session || !(req.session as any).userId) {
    throw new AppError('Authentication required', 401);
  }
  req.userId = (req.session as any).userId;
  next();
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  if (req.session && (req.session as any).userId) {
    req.userId = (req.session as any).userId;
  }
  next();
}