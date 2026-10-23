import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { googleAuthService, stateHash, secureEqual, GOOGLE_FLOW_TTL } from '../services/googleAuthService';
import { createUserSession, saveSession } from '../services/sessionService';

function frontend(path: string) { return new URL(path, config.cors.origin).toString(); }
function failure(res: Response, intent: 'login' | 'register', reason: string) {
  res.redirect(frontend(`/${intent === 'register' ? 'register' : 'login'}?google=${reason}`));
}

export class GoogleAuthController {
  status(req: Request, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    const pending = req.session.googleLink;
    res.json({ enabled: googleAuthService.enabled(), linkEmail: pending && pending.expires > Date.now() ? pending.accountEmail || pending.email : null });
  }

  async start(req: Request, res: Response, next: NextFunction) {
    const intent = req.query.intent === 'register' ? 'register' : 'login';
    res.setHeader('Cache-Control', 'no-store');
    if (!googleAuthService.enabled()) return failure(res, intent, 'unavailable');
    try {
      const { flow, url } = googleAuthService.begin(intent);
      req.session.googleFlow = flow;
      delete req.session.googleLink;
      await saveSession(req);
      res.redirect(url);
    } catch { next(new Error('Could not start Google sign-in.')); }
  }

  async callback(req: Request, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const flow = req.session.googleFlow;
    const intent = flow?.intent || 'login';
    const state = req.query.state;
    if (!flow || flow.expires < Date.now() || typeof state !== 'string' || state.length > 256 || !secureEqual(stateHash(state), flow.stateHash)) {
      return failure(res, intent, 'expired');
    }
    // Consume the browser-bound challenge before processing any provider response.
    delete req.session.googleFlow;
    try {
      await saveSession(req);
      if (req.query.error) return failure(res, intent, req.query.error === 'access_denied' ? 'cancelled' : 'failed');
      if (typeof req.query.code !== 'string' || req.query.code.length > 4096) return failure(res, intent, 'failed');
      const identity = await googleAuthService.identity(req.query.code, flow);
      const result = await googleAuthService.resolve(identity);
      if (result.linkRequired) {
        req.session.googleLink = { ...identity, accountEmail: result.linkEmail, expires: Date.now() + GOOGLE_FLOW_TTL };
        await saveSession(req);
        return res.redirect(frontend('/login?google=link_required'));
      }
      if (!result.user) return failure(res, intent, 'failed');
      await createUserSession(req, result.user.id);
      res.redirect(frontend('/dashboard'));
    } catch {
      // Provider errors may contain tokens, codes or client secrets. Never log them.
      failure(res, intent, 'failed');
    }
  }
}
export const googleAuthController = new GoogleAuthController();
