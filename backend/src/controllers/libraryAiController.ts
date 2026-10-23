import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { libraryRagService } from '../services/libraryRagService';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

// Single-process budget; deployment with multiple API replicas should replace
// this with a shared limiter. Entries expire to bound memory use.
const budgets = new Map<string, { count: number; until: number; busy: boolean }>();
export const libraryAiController = {
  async catalog(_req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await libraryRagService.catalog()); } catch (error) { next(error); }
  },
  async ask(req: AuthRequest, res: Response, next: NextFunction) {
    const now = Date.now(); const userId = req.userId!;
    for (const [id, entry] of budgets) if (entry.until < now && !entry.busy) budgets.delete(id);
    const budget = budgets.get(userId) || { count: 0, until: now + 15 * 60000, busy: false };
    if (budget.busy || budget.count >= 20) { next(new AppError('Please wait before asking another question. The limit is 20 questions per 15 minutes.', 429)); return; }
    budget.busy = true; budget.count++; budgets.set(userId, budget);
    try { res.json(await libraryRagService.ask(userId, req.body)); }
    catch (error) { next(error); }
    finally { budget.busy = false; }
  },
  async history(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ answers: await libraryRagService.history(req.userId!) }); } catch (error) { next(error); }
  },
  async clearHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try { await prisma.libraryAnswer.deleteMany({ where: { userId: req.userId! } }); res.status(204).send(); } catch (error) { next(error); }
  },
};
