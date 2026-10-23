export declare class RAGService {
    searchPassages(query: string, editionId?: string, limit?: number): Promise<({
        section: {
            edition: {
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
            };
        } & {
            id: string;
            createdAt: Date;
            sortOrder: number;
            editionId: string;
            parentId: string | null;
            title: string;
            slug: string;
            level: number;
        };
    } & {
        id: string;
        createdAt: Date;
        sectionId: string;
        reference: string;
        text: string;
        sourceNotes: string | null;
        wordCount: number;
        sortOrder: number;
    })[]>;
    getContextForPassage(passageId: string, contextSize?: number): Promise<{
        target: {
            section: {
                id: string;
                createdAt: Date;
                sortOrder: number;
                editionId: string;
                parentId: string | null;
                title: string;
                slug: string;
                level: number;
            };
        } & {
            id: string;
            createdAt: Date;
            sectionId: string;
            reference: string;
            text: string;
            sourceNotes: string | null;
            wordCount: number;
            sortOrder: number;
        };
        context: {
            id: string;
            createdAt: Date;
            sectionId: string;
            reference: string;
            text: string;
            sourceNotes: string | null;
            wordCount: number;
            sortOrder: number;
        }[];
        section: {
            id: string;
            createdAt: Date;
            sortOrder: number;
            editionId: string;
            parentId: string | null;
            title: string;
            slug: string;
            level: number;
        };
    } | null>;
    retrieveForQuestion(question: string, editionId?: string): Promise<{
        id: any;
        reference: any;
        text: any;
        section: any;
        scripture: any;
    }[]>;
}
export declare const ragService: RAGService;
//# sourceMappingURL=ragService.d.ts.map