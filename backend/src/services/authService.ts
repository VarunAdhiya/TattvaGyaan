import argon2 from 'argon2';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export class AuthService {
  async register(data: { email: string; username: string; password: string; displayName?: string; preferredLang?: string }) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });
    if (existing) {
      throw new AppError(
        existing.email === data.email ? 'Email already registered' : 'Username already taken',
        409
      );
    }

    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash,
        displayName: data.displayName || data.username,
        preferredLang: data.preferredLang || 'en',
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        preferredLang: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new AppError('Invalid email or password', 401);
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new AppError('Invalid email or password', 401);
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      preferredLang: user.preferredLang,
      createdAt: user.createdAt,
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        preferredLang: true,
        createdAt: true,
        updatedAt: true,
        googleSub: true,
        passwordHash: true,
      },
    });
    if (!user) throw new AppError('User not found', 404);
    const { googleSub, passwordHash, ...profile } = user;
    return { ...profile, signInMethods: { google: Boolean(googleSub), password: Boolean(passwordHash) } };
  }

  async updateProfile(userId: string, data: { displayName?: string; preferredLang?: string }) {
    await prisma.user.update({
      where: { id: userId },
      data: { displayName: data.displayName, preferredLang: data.preferredLang },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        preferredLang: true,
        createdAt: true,
      },
    });
    return this.getProfile(userId);
  }
}

export const authService = new AuthService();
