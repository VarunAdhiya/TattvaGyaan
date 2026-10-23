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
            sectionId: string;
            sortOrder: number;
            completed: boolean;
            dayNumber: number;
            passageIds: string[];
            completedAt: Date | null;
            estimatedMinutes: number | null;
            rationale: string | null;
            planId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        editionId: string;
        title: string;
        status: string;
        targetDays: number;
        startDate: Date;
        endDate: Date;
        minutesPerDay: number | null;
        analysis: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    getUserPlans(userId: string): Promise<any[]>;
    getPlan(planId: string, userId: string): Promise<{
        edition: ({
            scripture: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                title: string;
                slug: string;
                religionId: string;
                originalLang: string;
                description: string | null;
                summary: string | null;
                themes: string[];
                searchText: string;
                estimatedReadTime: number | null;
                availabilityStatus: string;
            };
        } & {
            id: string;
            createdAt: Date;
            title: string;
            scriptureId: string;
            language: string;
            script: string | null;
            translator: string | null;
            editor: string | null;
            source: string | null;
            license: string | null;
            provenance: string | null;
            contentStatus: string;
            expectedPassages: number | null;
            isOriginal: boolean;
            textDirection: string;
        }) | null;
        completionPercentage: number;
        items: {
            id: string;
            sectionId: string;
            sortOrder: number;
            completed: boolean;
            dayNumber: number;
            passageIds: string[];
            completedAt: Date | null;
            estimatedMinutes: number | null;
            rationale: string | null;
            planId: string;
        }[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        editionId: string;
        title: string;
        status: string;
        targetDays: number;
        startDate: Date;
        endDate: Date;
        minutesPerDay: number | null;
        analysis: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    completePlanItem(itemId: string, userId: string, completed: boolean): Promise<{
        id: string;
        sectionId: string;
        sortOrder: number;
        completed: boolean;
        dayNumber: number;
        passageIds: string[];
        completedAt: Date | null;
        estimatedMinutes: number | null;
        rationale: string | null;
        planId: string;
    }>;
    updatePlan(planId: string, userId: string, data: {
        status?: string;
        targetDays?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        editionId: string;
        title: string;
        status: string;
        targetDays: number;
        startDate: Date;
        endDate: Date;
        minutesPerDay: number | null;
        analysis: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    deletePlan(planId: string, userId: string): Promise<void>;
}
export declare const readingPlanService: ReadingPlanService;
//# sourceMappingURL=readingPlanService.d.ts.map