"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readingPlanService = exports.ReadingPlanService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const aiService_1 = require("./aiService");
const readingPlanSchedule_1 = require("./readingPlanSchedule");
class ReadingPlanService {
    async createPlan(userId, data) {
        const edition = await prisma_1.default.scriptureEdition.findUnique({
            where: { id: data.editionId },
            include: {
                scripture: true,
                sections: {
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        passages: {
                            orderBy: { sortOrder: 'asc' },
                            select: { id: true, text: true, wordCount: true, reference: true, sectionId: true },
                        },
                    },
                },
            },
        });
        if (!edition)
            throw new errorHandler_1.AppError('Edition not found', 404);
        const sections = edition.sections.filter(section => section.passages.length > 0);
        if (sections.length === 0)
            throw new errorHandler_1.AppError('No content available for this edition', 400);
        const wordCount = (passage) => passage.wordCount || Math.max(1, passage.text.trim().split(/\s+/u).length);
        // Keep analysis bounded even for large collections while sampling throughout every group.
        const groupSize = Math.ceil(sections.length / 24);
        const groups = [];
        const groupForSection = new Map();
        for (let i = 0; i < sections.length; i += groupSize) {
            const groupSections = sections.slice(i, i + groupSize);
            const passages = groupSections.flatMap(section => section.passages);
            const id = groups.length;
            groupSections.forEach(section => groupForSection.set(section.id, id));
            groups.push({
                id, titles: groupSections.map(section => section.title),
                passageCount: passages.length, wordCount: passages.reduce((sum, passage) => sum + wordCount(passage), 0),
                samples: [...new Set([0, Math.floor(passages.length / 2), passages.length - 1])].map(index => `${passages[index].reference}: ${passages[index].text.slice(0, 700)}`),
            });
        }
        const analysis = await aiService_1.aiService.analyzeReadingPace({
            title: edition.scripture.title, language: edition.language,
            targetDays: data.targetDays, minutesPerDay: data.minutesPerDay, groups,
        });
        const allPassages = sections.flatMap(section => {
            const pace = analysis.groups.find(group => group.id === groupForSection.get(section.id));
            return section.passages.map(passage => ({
                ...passage,
                estimatedMinutes: wordCount(passage) / analysis.wordsPerMinute * pace.difficulty * (1 + analysis.reflectionPercent / 100),
                reason: pace.reason,
            }));
        });
        const totalEstimatedMinutes = allPassages.reduce((sum, passage) => sum + passage.estimatedMinutes, 0);
        const targetDays = Math.min(data.targetDays, allPassages.length);
        const startDate = data.startDate ? new Date(data.startDate) : new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + targetDays - 1);
        const items = (0, readingPlanSchedule_1.distributeReading)(allPassages, targetDays);
        const estimatedMinutesPerDay = Math.max(1, Math.ceil(totalEstimatedMinutes / targetDays));
        const plan = await prisma_1.default.readingPlan.create({
            data: {
                userId,
                editionId: data.editionId,
                title: data.title,
                targetDays: targetDays,
                startDate,
                endDate,
                minutesPerDay: estimatedMinutesPerDay,
                analysis: { ...analysis, requestedDays: data.targetDays, requestedMinutesPerDay: data.minutesPerDay ?? null,
                    suggestedDays: data.minutesPerDay ? Math.ceil(totalEstimatedMinutes / data.minutesPerDay) : targetDays,
                    basis: 'AI estimates from text samples, passage word counts, difficulty, and reflection time. Passage order is preserved.' },
                items: {
                    create: items.map((item, idx) => ({
                        dayNumber: item.dayNumber,
                        sectionId: item.sectionId,
                        passageIds: item.passageIds,
                        estimatedMinutes: item.estimatedMinutes,
                        rationale: item.rationale,
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
        const edition = await prisma_1.default.scriptureEdition.findUnique({
            where: { id: plan.editionId },
            include: {
                scripture: true,
            },
        });
        const completed = plan.items.filter((i) => i.completed).length;
        return {
            ...plan,
            edition,
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