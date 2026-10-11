import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

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

    if (!edition) throw new AppError('Edition not found', 404);

    const sections = edition.sections;
    if (sections.length === 0) throw new AppError('No content available for this edition', 400);

    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + data.targetDays - 1);

    const totalSections = sections.length;
    const sectionsPerDay = Math.max(1, Math.ceil(totalSections / data.targetDays));

    if (sectionsPerDay > 20) {
      throw new AppError(
        `Reading ${totalSections} sections in ${data.targetDays} days requires ~${sectionsPerDay} sections/day. Consider extending to at least ${Math.ceil(totalSections / 20)} days.`,
        400
      );
    }

    const items: { dayNumber: number; sectionId: string; passageIds: string[] }[] = [];
    let dayNumber = 1;

    for (let i = 0; i < sections.length; i += sectionsPerDay) {
      const daySections = sections.slice(i, i + sectionsPerDay);
      for (const section of daySections) {
        items.push({
          dayNumber,
          sectionId: section.id,
          passageIds: section.passages.map((p: any) => p.id),
        });
      }
      dayNumber++;
    }

    const plan = await prisma.readingPlan.create({
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

    const completed = plan.items.filter((i: any) => i.completed).length;
    return {
      ...plan,
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