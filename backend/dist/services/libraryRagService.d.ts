type Hit = {
    id: string;
    passageId: string;
    text: string;
    sourceHash: string;
    similarity?: number;
    score?: number;
};
export type LibrarySource = {
    id: string;
    passageId: string;
    editionId: string;
    scriptureId: string;
    title: string;
    edition: string;
    section: string;
    reference: string;
    excerpt: string;
    contentStatus: string;
    sourceHash: string;
    href: string | null;
};
export declare function validateLibraryAnswer(content: string, sources: LibrarySource[]): {
    answered: boolean;
    paragraphs: {
        text: string;
        sourceIds: string[];
    }[];
    sources: LibrarySource[];
};
export declare function fuseHits(semantic: Hit[], lexical: Hit[]): (Hit & {
    rankScore: number;
})[];
export declare function keywordQuery(question: string): string;
export declare function mentionedBooks(question: string): string[];
export declare function referenceTerms(question: string): string[];
declare class LibraryRagService {
    catalog(): Promise<{
        editions: {
            scripture: {
                title: string;
            };
            id: string;
            title: string;
            contentStatus: string;
        }[];
        ready: boolean;
        indexedPassages: number;
        totalPassages: number;
    }>;
    retrieve(question: string, editionId?: string): Promise<LibrarySource[]>;
    ask(userId: string, input: {
        question: string;
        responseLang: string;
        editionId?: string;
    }): Promise<{
        provider: string;
        model: string | null;
        message: string;
        answered: boolean;
        paragraphs: {
            text: string;
            sourceIds: string[];
        }[];
        sources: LibrarySource[];
        id: string;
        question: string;
        responseLang: string;
    }>;
    history(userId: string): Promise<any[]>;
}
export declare const libraryRagService: LibraryRagService;
export {};
//# sourceMappingURL=libraryRagService.d.ts.map