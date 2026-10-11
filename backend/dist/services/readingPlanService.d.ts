export declare class ReadingPlanService {
    createPlan(userId: string, data: {
        editionId: string;
        title: string;
        targetDays: number;
        minutesPerDay?: number;
        startDate?: string;
    }): Promise<{
        items: {
            id: string;
            sortOrder: number;
            sectionId: string;
            dayNumber: number;
            passageIds: string[];
            completed: boolean;
            completedAt: Date | null;
            planId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        title: string;
        editionId: string;
        userId: string;
        targetDays: number;
        startDate: Date;
        endDate: Date;
        minutesPerDay: number | null;
    }>;
    getUserPlans(userId: string): Promise<any[]>;
    getPlan(planId: string, userId: string): Promise<{
        completionPercentage: number;
        items: {
            id: string;
            sortOrder: number;
            sectionId: string;
            dayNumber: number;
            passageIds: string[];
            completed: boolean;
            completedAt: Date | null;
            planId: string;
        }[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        title: string;
        editionId: string;
        userId: string;
        targetDays: number;
        startDate: Date;
        endDate: Date;
        minutesPerDay: number | null;
    }>;
    completePlanItem(itemId: string, userId: string, completed: boolean): Promise<{
        id: string;
        sortOrder: number;
        sectionId: string;
        dayNumber: number;
        passageIds: string[];
        completed: boolean;
        completedAt: Date | null;
        planId: string;
    }>;
    updatePlan(planId: string, userId: string, data: {
        status?: string;
        targetDays?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        title: string;
        editionId: string;
        userId: string;
        targetDays: number;
        startDate: Date;
        endDate: Date;
        minutesPerDay: number | null;
    }>;
    deletePlan(planId: string, userId: string): Promise<void>;
}
export declare const readingPlanService: ReadingPlanService;
//# sourceMappingURL=readingPlanService.d.ts.map