import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { aiService } from './aiService';
import { distributeReading } from './readingPlanSchedule';

export class ReadingPlanService {
  async createPlan(userId: string, data: {
    editionId: string;
    title: string;
    targetDays: number;
    minutesPerDay?: number;
    startDate?: string;
  }) {
    const edition = await prisma.scriptureEdition.findUnique({
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

    if (!edition) throw new AppError('Edition not found', 404);

    const sections = edition.sections.filter(section => section.passages.length > 0);
    if (sections.length === 0) throw new AppError('No content available for this edition', 400);

    const wordCount = (passage: { text: string; wordCount: number }) => passage.wordCount || Math.max(1, passage.text.trim().split(/\s+/u).length);
    // Keep analysis bounded even for large collections while sampling throughout every group.
    const groupSize = Math.ceil(sections.length / 24);
    const groups: { id: number; titles: string[]; passageCount: number; wordCount: number; samples: string[] }[] = [];
    const groupForSection = new Map<string, number>();
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
    const analysis = await aiService.analyzeReadingPace({
      title: edition.scripture.title, language: edition.language,
      targetDays: data.targetDays, minutesPerDay: data.minutesPerDay, groups,
    });
    const allPassages = sections.flatMap(section => {
      const pace = analysis.groups.find(group => group.id === groupForSection.get(section.id))!;
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

    const items = distributeReading(allPassages, targetDays);
    const estimatedMinutesPerDay = Math.max(1, Math.ceil(totalEstimatedMinutes / targetDays));

    const plan = await prisma.readingPlan.create({
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

  async getUserPlans(userId: string) {
    const plans = await prisma.readingPlan.findMany({
      where: { userId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return plans.map((plan: any) => {
      const completed = plan.items.filter((i: any) => i.completed).length;
      const total = plan.items.length;
      return {
        ...plan,
        completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        completedItems: completed,
        totalItems: total,
      };
    });
  }

  async getPlan(planId: string, userId: string) {
    const plan = await prisma.readingPlan.findUnique({
      where: { id: planId },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!plan) throw new AppError('Plan not found', 404);
    if (plan.userId !== userId) throw new AppError('Access denied', 403);

    const edition = await prisma.scriptureEdition.findUnique({
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

  async completePlanItem(itemId: string, userId: string, completed: boolean) {
    const item = await prisma.readingPlanItem.findUnique({
      where: { id: itemId },
      include: { plan: true },
    });
    if (!item) throw new AppError('Plan item not found', 404);
    if (item.plan.userId !== userId) throw new AppError('Access denied', 403);

    return prisma.readingPlanItem.update({
      where: { id: itemId },
      data: {
        completed,
        completedAt: completed ? new Date() : null,
      },
    });
  }

  async updatePlan(planId: string, userId: string, data: { status?: string; targetDays?: number }) {
    const plan = await prisma.readingPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new AppError('Plan not found', 404);
    if (plan.userId !== userId) throw new AppError('Access denied', 403);

    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.targetDays) {
      updateData.targetDays = data.targetDays;
      const newEndDate = new Date(plan.startDate);
      newEndDate.setDate(newEndDate.getDate() + data.targetDays - 1);
      updateData.endDate = newEndDate;
    }

    return prisma.readingPlan.update({
      where: { id: planId },
      data: updateData,
    });
  }

  async deletePlan(planId: string, userId: string) {
    const plan = await prisma.readingPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new AppError('Plan not found', 404);
    if (plan.userId !== userId) throw new AppError('Access denied', 403);

    await prisma.readingPlan.delete({ where: { id: planId } });
  }
}

export const readingPlanService = new ReadingPlanService();
