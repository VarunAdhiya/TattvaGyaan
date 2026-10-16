export declare class ScriptureService {
    getReligions(): Promise<({
        _count: {
            scriptures: number;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        slug: string;
        description: string | null;
        iconUrl: string | null;
        sortOrder: number;
    })[]>;
    getReligion(id: string): Promise<{
        scriptures: ({
            editions: {
                id: string;
                title: string;
                language: string;
                isOriginal: boolean;
            }[];
        } & {
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
        })[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        slug: string;
        description: string | null;
        iconUrl: string | null;
        sortOrder: number;
    }>;
    getScriptures(filters: {
        religionId?: string;
        language?: string;
        search?: string;
        page: number;
        limit: number;
    }): Promise<{
        scriptures: ({
            religion: {
                id: string;
                name: string;
                slug: string;
            };
            editions: {
                id: string;
                title: string;
                language: string;
                contentStatus: string;
                expectedPassages: number | null;
                isOriginal: boolean;
                textDirection: string;
            }[];
        } & {
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
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getScripture(id: string): Promise<{
        religion: {
            id: string;
            createdAt: Date;
            name: string;
            slug: string;
            description: string | null;
            iconUrl: string | null;
            sortOrder: number;
        };
        editions: ({
            _count: {
                sections: number;
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
        })[];
    } & {
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
    }>;
    getEdition(id: string): Promise<{
        scripture: {
            religion: {
                id: string;
                createdAt: Date;
                name: string;
                slug: string;
                description: string | null;
                iconUrl: string | null;
                sortOrder: number;
            };
        } & {
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
        sections: ({
            children: {
                id: string;
                createdAt: Date;
                slug: string;
                sortOrder: number;
                title: string;
                parentId: string | null;
                editionId: string;
                level: number;
            }[];
        } & {
            id: string;
            createdAt: Date;
            slug: string;
            sortOrder: number;
            title: string;
            parentId: string | null;
            editionId: string;
            level: number;
        })[];
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
    }>;
    getSectionPassages(sectionId: string, page?: number, limit?: number): Promise<{
        section: {
            edition: {
                scripture: {
                    title: string;
                };
                id: string;
                language: string;
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
        passages: {
            id: string;
            createdAt: Date;
            sortOrder: number;
            sectionId: string;
            reference: string;
            text: string;
            sourceNotes: string | null;
            wordCount: number;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getPassage(id: string): Promise<{
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
    }>;
    getEditionsByScripture(scriptureId: string): Promise<{
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
    }[]>;
    getPassagesForReader(editionId: string, includeBookText?: boolean): Promise<{
        id: string;
        _count: {
            passages: number;
        };
        slug: string;
        title: string;
        parentId: string | null;
        passages: {
            id: string;
            createdAt: Date;
            sortOrder: number;
            sectionId: string;
            reference: string;
            text: string;
            sourceNotes: string | null;
            wordCount: number;
        }[];
    }[]>;
    getPassagePosition(id: string): Promise<{
        editionId: string;
        pageIndex: number;
    }>;
}
export declare const scriptureService: ScriptureService;
//# sourceMappingURL=scriptureService.d.ts.map