export declare const readerSlugs: string[];
export declare const readerEditionWhere: {
    language: string;
    OR: {
        source: string;
        contentStatus: string;
        scripture: {
            slug: string;
        };
    }[];
};
export declare function assertReaderEdition(edition: {
    source: string | null;
    language: string;
}): void;
//# sourceMappingURL=readerCatalog.d.ts.map