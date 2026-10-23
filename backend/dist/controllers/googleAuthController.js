"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAuthController = exports.GoogleAuthController = void 0;
const config_1 = require("../config");
const googleAuthService_1 = require("../services/googleAuthService");
const sessionService_1 = require("../services/sessionService");
function frontend(path) { return new URL(path, config_1.config.cors.origin).toString(); }
function failure(res, intent, reason) {
    res.redirect(frontend(`/${intent === 'register' ? 'register' : 'login'}?google=${reason}`));
}
class GoogleAuthController {
    status(req, res) {
        res.setHeader('Cache-Control', 'no-store');
        const pending = req.session.googleLink;
        res.json({ enabled: googleAuthService_1.googleAuthService.enabled(), linkEmail: pending && pending.expires > Date.now() ? pending.email : null });
    }
    async start(req, res, next) {
        const intent = req.query.intent === 'register' ? 'register' : 'login';
        res.setHeader('Cache-Control', 'no-store');
        if (!googleAuthService_1.googleAuthService.enabled())
            return failure(res, intent, 'unavailable');
        try {
            const { flow, url } = googleAuthService_1.googleAuthService.begin(intent);
            req.session.googleFlow = flow;
            delete req.session.googleLink;
            await (0, sessionService_1.saveSession)(req);
            res.redirect(url);
        }
        catch {
            next(new Error('Could not start Google sign-in.'));
        }
    }
    async callback(req, res) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Referrer-Policy', 'no-referrer');
        const flow = req.session.googleFlow;
        const intent = flow?.intent || 'login';
        const state = req.query.state;
        if (!flow || flow.expires < Date.now() || typeof state !== 'string' || state.length > 256 || !(0, googleAuthService_1.secureEqual)((0, googleAuthService_1.stateHash)(state), flow.stateHash)) {
            return failure(res, intent, 'expired');
        }
        // Consume the browser-bound challenge before processing any provider response.
        delete req.session.googleFlow;
        try {
            await (0, sessionService_1.saveSession)(req);
            if (req.query.error)
                return failure(res, intent, req.query.error === 'access_denied' ? 'cancelled' : 'failed');
            if (typeof req.query.code !== 'string' || req.query.code.length > 4096)
                return failure(res, intent, 'failed');
            const identity = await googleAuthService_1.googleAuthService.identity(req.query.code, flow);
            const result = await googleAuthService_1.googleAuthService.resolve(identity);
            if (result.linkRequired) {
                req.session.googleLink = { ...identity, expires: Date.now() + googleAuthService_1.GOOGLE_FLOW_TTL };
                await (0, sessionService_1.saveSession)(req);
                return res.redirect(frontend('/login?google=link_required'));
            }
            if (!result.user)
                return failure(res, intent, 'failed');
            await (0, sessionService_1.createUserSession)(req, result.user.id);
            res.redirect(frontend('/dashboard'));
        }
        catch {
            // Provider errors may contain tokens, codes or client secrets. Never log them.
            failure(res, intent, 'failed');
        }
    }
}
exports.GoogleAuthController = GoogleAuthController;
exports.googleAuthController = new GoogleAuthController();
//# sourceMappingURL=googleAuthController.js.map