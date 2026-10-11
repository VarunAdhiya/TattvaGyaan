"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readingPlanService = exports.ReadingPlanService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
class ReadingPlanService {
    async createPlan(userId, data) {
        const edition = await prisma_1.default.scriptureEdition.findUnique({
            where: { id: data.editionId },
            include: {
                sections: {
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        passages: {
                            orderBy: { sortOrder: 'asc' },
                            select: { id: true, wordCount: true },
                        },
                    },
                },
            },
        });
        if (!edition)
            throw new errorHandler_1.AppError('Edition not found', 404);
        const sections = edition.sections;
        if (sections.length === 0)
            throw new errorHandler_1.AppError('No content available for this edition', 400);
        const startDate = data.startDate ? new Date(data.startDate) : new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + data.targetDays - 1);
        const totalSections = sections.length;
        const sectionsPerDay = Math.max(1, Math.ceil(totalSections / data.targetDays));
        if (sectionsPerDay > 20) {
            throw new errorHandler_1.AppError(`Reading ${totalSections} sections in ${data.targetDays} days requires ~${sectionsPerDay} sections/day. Consider extending to at least ${Math.ceil(totalSections / 20)} days.`, 400);
        }
        const items = [];
        let dayNumber = 1;
        for (let i = 0; i < sections.length; i += sectionsPerDay) {
            const daySections = sections.slice(i, i + sectionsPerDay);
            for (const section of daySections) {
                items.push({
                    dayNumber,
                    sectionId: section.id,
                    passageIds: section.passages.map((p) => p.id),
                });
            }
            dayNumber++;
        }
        const plan = await prisma_1.default.readingPlan.create({
            data: {
                userId,
                editionId: data.editionId,
                title: data.title,
                targetDays: data.targetDays,
                startDate,
                endDate,
                minutesPerDay: data.minutesPerDay,
                items: {
                    create: items.map((item, idx) => ({
                        dayNumber: item.dayNumber,
                        sectionId: item.sectionId,
                        passageIds: item.passageIds,
                        sortOrder: idx,
                    })),
                },
            },
            include: {
                items: { orderBy: { sortOrder: 'asc' } },
            },
        });
        return plan;
    }
    async getUserPlans(userId) {
        const plans = await prisma_1.default.readingPlan.findMany({
            where: { userId },
            include: {
                items: {
                    orderBy: { sortOrder: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return plans.map((plan) => {
            const completed = plan.items.filter((i) => i.completed).length;
            const total = plan.items.length;
            return {
                ...plan,
                completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
                completedItems: completed,
                totalItems: total,
            };
        });
    }
    async getPlan(planId, userId) {
        const plan = await prisma_1.default.readingPlan.findUnique({
            where: { id: planId },
            include: {
                items: {
                    orderBy: { sortOrder: 'asc' },
                },
            },
        });
        if (!plan)
            throw new errorHandler_1.AppError('Plan not found', 404);
        if (plan.userId !== userId)
            throw new errorHandler_1.AppError('Access denied', 403);
        const completed = plan.items.filter((i) => i.completed).length;
        return {
            ...plan,
            completionPercentage: plan.items.length > 0 ? Math.round((completed / plan.items.length) * 100) : 0,
        };
    }
    async completePlanItem(itemId, userId, completed) {
        const item = await prisma_1.default.readingPlanItem.findUnique({
            where: { id: itemId },
            include: { plan: true },
        });
        if (!item)
            throw new errorHandler_1.AppError('Plan item not found', 404);
        if (item.plan.userId !== userId)
            throw new errorHandler_1.AppError('Access denied', 403);
        return prisma_1.default.readingPlanItem.update({
            where: { id: itemId },
            data: {
                completed,
                completedAt: completed ? new Date() : null,
            },
        });
    }
    async updatePlan(planId, userId, data) {
        const plan = await prisma_1.default.readingPlan.findUnique({ where: { id: planId } });
        if (!plan)
            throw new errorHandler_1.AppError('Plan not found', 404);
        if (plan.userId !== userId)
            throw new errorHandler_1.AppError('Access denied', 403);
        const updateData = {};
        if (data.status)
            updateData.status = data.status;
        if (data.targetDays) {
            updateData.targetDays = data.targetDays;
            const newEndDate = new Date(plan.startDate);
            newEndDate.setDate(newEndDate.getDate() + data.targetDays - 1);
            updateData.endDate = newEndDate;
        }
        return prisma_1.default.readingPlan.update({
            where: { id: planId },
            data: updateData,
        });
    }
    async deletePlan(planId, userId) {
        const plan = await prisma_1.default.readingPlan.findUnique({ where: { id: planId } });
        if (!plan)
            throw new errorHandler_1.AppError('Plan not found', 404);
        if (plan.userId !== userId)
            throw new errorHandler_1.AppError('Access denied', 403);
        await prisma_1.default.readingPlan.delete({ where: { id: planId } });
    }
}
exports.ReadingPlanService = ReadingPlanService;
exports.readingPlanService = new ReadingPlanService();
//# sourceMappingURL=readingPlanService.js.map