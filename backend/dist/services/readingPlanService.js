"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readingPlanService = exports.ReadingPlanService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
class ReadingPlanService {
    calculateReadingMetrics(sections) {
        let totalWords = 0;
        let totalPassages = 0;
        sections.forEach(section => {
            section.passages.forEach((passage) => {
                totalWords += passage.wordCount || 0;
                totalPassages++;
            });
        });
        return { totalWords, totalPassages };
    }
    async generateAIOptimizedPlan(sections, targetDays, minutesPerDay) {
        const { totalWords, totalPassages } = this.calculateReadingMetrics(sections);
        const averageReadingSpeed = 200; // words per minute
        const totalEstimatedMinutes = totalWords / averageReadingSpeed;
        // Calculate ideal distribution
        const minutesPerDayTarget = minutesPerDay || (totalEstimatedMinutes / targetDays);
        const wordsPerDay = minutesPerDayTarget * averageReadingSpeed;
        // AI-enhanced section grouping
        const sectionGroups = [];
        let currentGroup = [];
        let currentWordCount = 0;
        for (const section of sections) {
            const sectionWords = section.passages.reduce((sum, p) => sum + (p.wordCount || 0), 0);
            // If adding this section would exceed daily target, start new group
            if (currentWordCount > 0 && currentWordCount + sectionWords > wordsPerDay * 1.2) {
                sectionGroups.push([...currentGroup]);
                currentGroup = [section];
                currentWordCount = sectionWords;
            }
            else {
                currentGroup.push(section);
                currentWordCount += sectionWords;
            }
        }
        // Add the last group
        if (currentGroup.length > 0) {
            sectionGroups.push(currentGroup);
        }
        // If we have more groups than target days, combine smaller groups
        while (sectionGroups.length > targetDays && sectionGroups.length > 1) {
            // Find two smallest groups to combine
            let minIndex = 0;
            let minWords = this.calculateReadingMetrics(sectionGroups[0]).totalWords;
            for (let i = 1; i < sectionGroups.length; i++) {
                const words = this.calculateReadingMetrics(sectionGroups[i]).totalWords;
                if (words < minWords) {
                    minWords = words;
                    minIndex = i;
                }
            }
            // Combine with next group if possible
            if (minIndex < sectionGroups.length - 1) {
                sectionGroups[minIndex] = [...sectionGroups[minIndex], ...sectionGroups[minIndex + 1]];
                sectionGroups.splice(minIndex + 1, 1);
            }
            else if (minIndex > 0) {
                sectionGroups[minIndex - 1] = [...sectionGroups[minIndex - 1], ...sectionGroups[minIndex]];
                sectionGroups.splice(minIndex, 1);
            }
        }
        return sectionGroups;
    }
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
                            select: { id: true, wordCount: true, reference: true, sectionId: true },
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
        // Collect all passages in sequential order across sections
        const allPassages = [];
        sections.forEach(sec => {
            sec.passages.forEach(p => {
                allPassages.push({
                    id: p.id,
                    sectionId: sec.id,
                    wordCount: p.wordCount || 30, // fallback estimate
                    reference: p.reference,
                });
            });
        });
        if (allPassages.length === 0) {
            throw new errorHandler_1.AppError('No passages found for this scripture edition', 400);
        }
        const targetDays = Math.max(1, Math.min(data.targetDays, 365));
        const startDate = data.startDate ? new Date(data.startDate) : new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + targetDays - 1);
        const totalWords = allPassages.reduce((sum, p) => sum + p.wordCount, 0);
        const avgWordsPerMinute = 150; // respectful contemplative scripture reading speed
        const totalEstimatedMinutes = Math.ceil(totalWords / avgWordsPerMinute);
        const estimatedMinutesPerDay = data.minutesPerDay || Math.max(10, Math.ceil(totalEstimatedMinutes / targetDays));
        // Distribute passages proportionally across targetDays
        const totalPassages = allPassages.length;
        const items = [];
        // Smart chunking: distribute total passages smoothly over targetDays
        let currentPassageIndex = 0;
        for (let day = 1; day <= targetDays; day++) {
            // Calculate how many passages should be finished by end of this day
            const targetCumulativePassages = Math.round((day / targetDays) * totalPassages);
            const dayPassages = allPassages.slice(currentPassageIndex, targetCumulativePassages);
            if (dayPassages.length > 0) {
                // Group by section or use the primary section of this chunk
                const primarySectionId = dayPassages[0].sectionId;
                items.push({
                    dayNumber: day,
                    sectionId: primarySectionId,
                    passageIds: dayPassages.map(p => p.id),
                });
                currentPassageIndex = targetCumulativePassages;
            }
        }
        // Edge case: if any remaining passages, add to the last day
        if (currentPassageIndex < totalPassages && items.length > 0) {
            const remaining = allPassages.slice(currentPassageIndex);
            items[items.length - 1].passageIds.push(...remaining.map(p => p.id));
        }
        const plan = await prisma_1.default.readingPlan.create({
            data: {
                userId,
                editionId: data.editionId,
                title: data.title,
                targetDays: targetDays,
                startDate,
                endDate,
                minutesPerDay: estimatedMinutesPerDay,
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