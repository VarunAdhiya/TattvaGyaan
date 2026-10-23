import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import prisma from '../lib/prisma';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

export type GoogleIdentity = { sub: string; email: string; name?: string };
export type GoogleFlow = { stateHash: string; nonce: string; verifier: string; expires: number; intent: 'login' | 'register' };
export const GOOGLE_FLOW_TTL = 10 * 60 * 1000;
const userSelect = { id: true, email: true, username: true, displayName: true, preferredLang: true, createdAt: true } as const;

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    googleFlow?: GoogleFlow;
    googleLink?: GoogleIdentity & { expires: number; accountEmail?: string };
  }
}

export function secureEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function stateHash(state: string) { return createHash('sha256').update(state).digest('hex'); }

export class GoogleAuthService {
  enabled() { return Boolean(config.google.clientId && config.google.clientSecret); }

  client() {
    if (!this.enabled()) throw new AppError('Google sign-in is not configured.', 503);
    return new OAuth2Client({ clientId: config.google.clientId, clientSecret: config.google.clientSecret,
      redirectUri: config.google.redirectUri, transporterOptions: { timeout: 15000, retry: false } });
  }

  begin(intent: 'login' | 'register') {
    const state = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const nonce = randomBytes(32).toString('base64url');
    const flow: GoogleFlow = { stateHash: stateHash(state), nonce, verifier, expires: Date.now() + GOOGLE_FLOW_TTL, intent };
    const url = new URL(this.client().generateAuthUrl({ scope: ['openid', 'email', 'profile'], access_type: 'online',
      prompt: 'select_account', state, code_challenge_method: CodeChallengeMethod.S256,
      code_challenge: createHash('sha256').update(verifier).digest('base64url') }));
    url.searchParams.set('nonce', nonce);
    return { flow, url: url.toString() };
  }

  async identity(code: string, flow: GoogleFlow): Promise<GoogleIdentity> {
    const client = this.client();
    const { tokens } = await client.getToken({ code, codeVerifier: flow.verifier, redirect_uri: config.google.redirectUri });
    if (!tokens.id_token) throw new AppError('Google did not return an identity token.', 401);
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.google.clientId });
    const payload = ticket.getPayload() as (ReturnType<typeof ticket.getPayload> & { nonce?: string });
    if (!payload?.sub || payload.sub.length > 255 || !payload.email || !payload.email_verified ||
        !payload.nonce || !secureEqual(payload.nonce, flow.nonce)) throw new AppError('Google identity could not be verified.', 401);
    return { sub: payload.sub, email: payload.email.trim().toLowerCase(), name: payload.name?.slice(0, 100) };
  }

  async resolve(identity: GoogleIdentity) {
    const linked = await prisma.user.findUnique({ where: { googleSub: identity.sub }, select: userSelect });
    if (linked) return { user: linked, linkRequired: false };
    // A matching email alone is not sufficient proof of ownership of an existing app account.
    const existing = await prisma.user.findFirst({ where: { email: { equals: identity.email, mode: 'insensitive' } }, select: { id: true, email: true } });
    if (existing) return { user: null, linkRequired: true, linkEmail: existing.email };
    try {
      const user = await prisma.user.create({ data: { googleSub: identity.sub, email: identity.email,
        username: 'google_' + randomBytes(9).toString('hex'), displayName: identity.name || identity.email.split('@')[0],
        passwordHash: null, preferredLang: 'en' }, select: userSelect });
      return { user, linkRequired: false };
    } catch (error) {
      // Concurrent sign-ins must not create duplicate accounts.
      if ((error as { code?: string }).code !== 'P2002') throw error;
      const user = await prisma.user.findUnique({ where: { googleSub: identity.sub }, select: userSelect });
      if (user) return { user, linkRequired: false };
      throw new AppError('This account changed during sign-in. Please try Google sign-in again.', 409);
    }
  }

  async link(userId: string, identity: GoogleIdentity & { expires: number }) {
    if (identity.expires < Date.now()) throw new AppError('Google confirmation expired. Start Google sign-in again.', 401);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, googleSub: true } });
    if (!user || user.email.toLowerCase() !== identity.email || (user.googleSub && user.googleSub !== identity.sub)) {
      throw new AppError('Sign in to the existing account with the same Google email address.', 409);
    }
    if (user.googleSub === identity.sub) return;
    try {
      const changed = await prisma.user.updateMany({ where: { id: userId, googleSub: null }, data: { googleSub: identity.sub } });
      if (changed.count !== 1) throw new AppError('Google could not be connected. Please start again.', 409);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new AppError('This Google account is already connected to another account.', 409);
      throw error;
    }
  }
}
export const googleAuthService = new GoogleAuthService();
