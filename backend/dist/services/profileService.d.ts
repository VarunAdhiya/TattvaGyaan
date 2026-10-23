export declare class ProfileService {
    activity(userId: string): Promise<{
        stats: {
            booksOpened: number;
            bookmarks: number;
            notes: number;
            completedPlans: number;
        };
        books: {
            scriptureId: string;
            editionId: string;
            title: string;
            bookmarks: number;
            notes: number;
            percentage: number | null;
            lastReadAt: Date | null;
        }[];
    }>;
}
export declare const profileService: ProfileService;
//# sourceMappingURL=profileService.d.ts.map