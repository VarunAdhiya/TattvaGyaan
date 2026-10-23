"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAuthService = exports.GoogleAuthService = exports.GOOGLE_FLOW_TTL = void 0;
exports.secureEqual = secureEqual;
exports.stateHash = stateHash;
const google_auth_library_1 = require("google-auth-library");
const node_crypto_1 = require("node:crypto");
const prisma_1 = __importDefault(require("../lib/prisma"));
const config_1 = require("../config");
const errorHandler_1 = require("../middleware/errorHandler");
exports.GOOGLE_FLOW_TTL = 10 * 60 * 1000;
const userSelect = { id: true, email: true, username: true, displayName: true, preferredLang: true, createdAt: true };
function secureEqual(left, right) {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && (0, node_crypto_1.timingSafeEqual)(a, b);
}
function stateHash(state) { return (0, node_crypto_1.createHash)('sha256').update(state).digest('hex'); }
class GoogleAuthService {
    enabled() { return Boolean(config_1.config.google.clientId && config_1.config.google.clientSecret); }
    client() {
        if (!this.enabled())
            throw new errorHandler_1.AppError('Google sign-in is not configured.', 503);
        return new google_auth_library_1.OAuth2Client({ clientId: config_1.config.google.clientId, clientSecret: config_1.config.google.clientSecret,
            redirectUri: config_1.config.google.redirectUri, transporterOptions: { timeout: 15000, retry: false } });
    }
    begin(intent) {
        const state = (0, node_crypto_1.randomBytes)(32).toString('base64url');
        const verifier = (0, node_crypto_1.randomBytes)(32).toString('base64url');
        const nonce = (0, node_crypto_1.randomBytes)(32).toString('base64url');
        const flow = { stateHash: stateHash(state), nonce, verifier, expires: Date.now() + exports.GOOGLE_FLOW_TTL, intent };
        const url = new URL(this.client().generateAuthUrl({ scope: ['openid', 'email', 'profile'], access_type: 'online',
            prompt: 'select_account', state, code_challenge_method: google_auth_library_1.CodeChallengeMethod.S256,
            code_challenge: (0, node_crypto_1.createHash)('sha256').update(verifier).digest('base64url') }));
        url.searchParams.set('nonce', nonce);
        return { flow, url: url.toString() };
    }
    async identity(code, flow) {
        const client = this.client();
        const { tokens } = await client.getToken({ code, codeVerifier: flow.verifier, redirect_uri: config_1.config.google.redirectUri });
        if (!tokens.id_token)
            throw new errorHandler_1.AppError('Google did not return an identity token.', 401);
        const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config_1.config.google.clientId });
        const payload = ticket.getPayload();
        if (!payload?.sub || payload.sub.length > 255 || !payload.email || !payload.email_verified ||
            !payload.nonce || !secureEqual(payload.nonce, flow.nonce))
            throw new errorHandler_1.AppError('Google identity could not be verified.', 401);
        return { sub: payload.sub, email: payload.email.trim().toLowerCase(), name: payload.name?.slice(0, 100) };
    }
    async resolve(identity) {
        const linked = await prisma_1.default.user.findUnique({ where: { googleSub: identity.sub }, select: userSelect });
        if (linked)
            return { user: linked, linkRequired: false };
        // A matching email alone is not sufficient proof of ownership of an existing app account.
        const existing = await prisma_1.default.user.findFirst({ where: { email: { equals: identity.email, mode: 'insensitive' } }, select: { id: true } });
        if (existing)
            return { user: null, linkRequired: true };
        try {
            const user = await prisma_1.default.user.create({ data: { googleSub: identity.sub, email: identity.email,
                    username: 'google_' + (0, node_crypto_1.randomBytes)(9).toString('hex'), displayName: identity.name || identity.email.split('@')[0],
                    passwordHash: null, preferredLang: 'en' }, select: userSelect });
            return { user, linkRequired: false };
        }
        catch (error) {
            // Concurrent sign-ins must not create duplicate accounts.
            if (error.code !== 'P2002')
                throw error;
            const user = await prisma_1.default.user.findUnique({ where: { googleSub: identity.sub }, select: userSelect });
            if (user)
                return { user, linkRequired: false };
            throw new errorHandler_1.AppError('This account changed during sign-in. Please try Google sign-in again.', 409);
        }
    }
    async link(userId, identity) {
        if (identity.expires < Date.now())
            throw new errorHandler_1.AppError('Google confirmation expired. Start Google sign-in again.', 401);
        const user = await prisma_1.default.user.findUnique({ where: { id: userId }, select: { email: true, googleSub: true } });
        if (!user || user.email.toLowerCase() !== identity.email || (user.googleSub && user.googleSub !== identity.sub)) {
            throw new errorHandler_1.AppError('Sign in to the existing account with the same Google email address.', 409);
        }
        if (user.googleSub === identity.sub)
            return;
        try {
            const changed = await prisma_1.default.user.updateMany({ where: { id: userId, googleSub: null }, data: { googleSub: identity.sub } });
            if (changed.count !== 1)
                throw new errorHandler_1.AppError('Google could not be connected. Please start again.', 409);
        }
        catch (error) {
            if (error.code === 'P2002')
                throw new errorHandler_1.AppError('This Google account is already connected to another account.', 409);
            throw error;
        }
    }
}
exports.GoogleAuthService = GoogleAuthService;
exports.googleAuthService = new GoogleAuthService();
//# sourceMappingURL=googleAuthService.js.map