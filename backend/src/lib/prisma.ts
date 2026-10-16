import { PrismaClient as PC } from '@prisma/client';
import { config } from '../config';

const globalForPrisma = globalThis as unknown as { prisma: PC };

export const prisma = globalForPrisma.prisma || new PC({
  ...(config.database.prismaUrl ? { datasources: { db: { url: config.database.prismaUrl } } } : {}),
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
