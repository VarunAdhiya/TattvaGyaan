import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { devotionalFilterSchema } from '../validators/devotionalSchema';

const summarySelect = {
  id: true, category: true, slug: true, title: true, titleHindi: true,
  deity: true, contentStatus: true, sourceUrl: true,
} as const;

export async function listDevotionals(filter: z.infer<typeof devotionalFilterSchema>) {
  const where: Prisma.DevotionalTextWhereInput = {
    category: filter.category,
    ...(filter.deity ? { deity: filter.deity } : {}),
    ...(filter.search ? { OR: ['title', 'titleHindi', 'deity'].map(field => ({ [field]: { contains: filter.search, mode: 'insensitive' } })) } : {}),
  };
  const [texts, total, facets] = await prisma.$transaction([
    prisma.devotionalText.findMany({ where, select: summarySelect, orderBy: [{ title: 'asc' }, { id: 'asc' }], skip: (filter.page - 1) * filter.limit, take: filter.limit }),
    prisma.devotionalText.count({ where }),
    prisma.devotionalText.groupBy({ by: ['deity'], where: { category: filter.category }, _count: true, orderBy: { deity: 'asc' } }),
  ]);
  return { texts, total, page: filter.page, pages: Math.ceil(total / filter.limit), deities: facets.map(f => ({ name: f.deity, count: f._count })) };
}

export async function getDevotional(category: string, slug: string) {
  const text = await prisma.devotionalText.findUnique({ where: { category_slug: { category, slug } } });
  if (!text) throw new AppError('This prayer was not found.', 404);
  const related = await prisma.devotionalText.findMany({
    where: { category, id: { not: text.id } }, select: summarySelect,
    orderBy: { title: 'asc' }, take: 6,
  });
  return { text, related };
}

export async function getCalendarMonth(year: number, month: number) {
  const [days, bounds] = await prisma.$transaction([
    prisma.calendarDay.findMany({
      where: { date: { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) } },
      orderBy: { date: 'asc' },
    }),
    prisma.calendarDay.aggregate({ _min: { date: true }, _max: { date: true } }),
  ]);
  return {
    year, month, location: 'New Delhi, India', timezone: 'Asia/Kolkata',
    note: 'North Indian calendar. Festival dates may vary by region. All times are in IST.',
    availableFrom: bounds._min.date?.toISOString().slice(0, 10) || null,
    availableTo: bounds._max.date?.toISOString().slice(0, 10) || null,
    days: days.map(day => ({ date: day.date.toISOString().slice(0, 10), data: day.data, sourceUrl: day.sourceUrl, fetchedAt: day.fetchedAt })),
  };
}
