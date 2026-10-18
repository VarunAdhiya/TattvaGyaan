"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDevotionals = listDevotionals;
exports.getDevotional = getDevotional;
exports.getCalendarMonth = getCalendarMonth;
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const summarySelect = {
    id: true, category: true, slug: true, title: true, titleHindi: true,
    deity: true, contentStatus: true, sourceUrl: true,
};
async function listDevotionals(filter) {
    const where = {
        category: filter.category,
        ...(filter.deity ? { deity: filter.deity } : {}),
        ...(filter.search ? { OR: ['title', 'titleHindi', 'deity'].map(field => ({ [field]: { contains: filter.search, mode: 'insensitive' } })) } : {}),
    };
    const [texts, total, facets] = await prisma_1.default.$transaction([
        prisma_1.default.devotionalText.findMany({ where, select: summarySelect, orderBy: [{ title: 'asc' }, { id: 'asc' }], skip: (filter.page - 1) * filter.limit, take: filter.limit }),
        prisma_1.default.devotionalText.count({ where }),
        prisma_1.default.devotionalText.groupBy({ by: ['deity'], where: { category: filter.category }, _count: true, orderBy: { deity: 'asc' } }),
    ]);
    return { texts, total, page: filter.page, pages: Math.ceil(total / filter.limit), deities: facets.map(f => ({ name: f.deity, count: f._count })) };
}
async function getDevotional(category, slug) {
    const text = await prisma_1.default.devotionalText.findUnique({ where: { category_slug: { category, slug } } });
    if (!text)
        throw new errorHandler_1.AppError('This prayer was not found.', 404);
    const related = await prisma_1.default.devotionalText.findMany({
        where: { category, id: { not: text.id } }, select: summarySelect,
        orderBy: { title: 'asc' }, take: 6,
    });
    return { text, related };
}
async function getCalendarMonth(year, month) {
    const [days, bounds] = await prisma_1.default.$transaction([
        prisma_1.default.calendarDay.findMany({
            where: { date: { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) } },
            orderBy: { date: 'asc' },
        }),
        prisma_1.default.calendarDay.aggregate({ _min: { date: true }, _max: { date: true } }),
    ]);
    return {
        year, month, location: 'New Delhi, India', timezone: 'Asia/Kolkata',
        note: 'North Indian calendar. Festival dates may vary by region. All times are in IST.',
        availableFrom: bounds._min.date?.toISOString().slice(0, 10) || null,
        availableTo: bounds._max.date?.toISOString().slice(0, 10) || null,
        days: days.map(day => ({ date: day.date.toISOString().slice(0, 10), data: day.data, sourceUrl: day.sourceUrl, fetchedAt: day.fetchedAt })),
    };
}
//# sourceMappingURL=devotionalService.js.map