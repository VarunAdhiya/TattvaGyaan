export declare class RAGService {
    searchPassages(query: string, editionId?: string, limit?: number): Promise<({
        section: {
            edition: {
                scripture: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    slug: string;
                    description: string | null;
                    title: string;
                    religionId: string;
                    originalLang: string;
                    summary: string | null;
                    themes: string[];
                    searchText: string;
                    estimatedReadTime: number | null;
                    availabilityStatus: string;
                };
            } & {
                id: string;
                createdAt: Date;
                scriptureId: string;
                title: string;
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
            slug: string;
            sortOrder: number;
            title: string;
            parentId: string | null;
            editionId: string;
            level: number;
        };
    } & {
        id: string;
        createdAt: Date;
        sortOrder: number;
        sectionId: string;
        reference: string;
        text: string;
        sourceNotes: string | null;
        wordCount: number;
    })[]>;
    getContextForPassage(passageId: string, contextSize?: number): Promise<{
        target: {
            section: {
                id: string;
                createdAt: Date;
                slug: string;
                sortOrder: number;
                title: string;
                parentId: string | null;
                editionId: string;
                level: number;
            };
        } & {
            id: string;
            createdAt: Date;
            sortOrder: number;
            sectionId: string;
            reference: string;
            text: string;
            sourceNotes: string | null;
            wordCount: number;
        };
        context: {
            id: string;
            createdAt: Date;
            sortOrder: number;
            sectionId: string;
            reference: string;
            text: string;
            sourceNotes: string | null;
            wordCount: number;
        }[];
        section: {
            id: string;
            createdAt: Date;
            slug: string;
            sortOrder: number;
            title: string;
            parentId: string | null;
            editionId: string;
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