export interface PlannedPassage {
    id: string;
    sectionId: string;
    reference: string;
    estimatedMinutes: number;
    reason: string;
}
export declare function distributeReading(passages: PlannedPassage[], requestedDays: number): {
    dayNumber: number;
    sectionId: string;
    passageIds: string[];
    estimatedMinutes: number;
    rationale: string;
}[];
//# sourceMappingURL=readingPlanSchedule.d.ts.map