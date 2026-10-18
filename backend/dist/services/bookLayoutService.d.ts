export declare const GARUDA_SOURCE = "urn:sha256:c05368e6b60c64f58b2b86b8a9375d483259cd81d6b2469faaafb4a698a6dcb0";
export declare const MANUSMRITI_SOURCE = "urn:sha256:992c71ecb2a16913c2fb578ae51f3a73d6288109f133b10b811d1b976f8698e3";
export declare const RAMAYAN_SOURCE = "urn:sha256:759f2adbfd2fc1191ff8576401d1cbc34bbfefaf79a573e8747c53d4c858af75";
export declare const GITA_SOURCE = "https://gitabhawan.org.in/gita/research";
export declare const TYPESET_SOURCES: string[];
type Passage = {
    reference: string;
    text: string;
};
type Block = {
    kind: string;
    chapterKey?: string;
    title?: string;
    keepTogether?: boolean;
    keepWithNext?: boolean;
    pageBreakBefore?: boolean;
    sourcePage?: number;
    printedPage?: string | null;
    parts: {
        reference: string;
        start: number;
        end: number;
    }[];
};
export declare function bookReadingBlocks(source: string | null, slug: string, passages: Passage[]): Block[] | undefined;
export declare function chapterContext(source: string | null, section: {
    slug: string;
    title: string;
    passages: Passage[];
}, chapterKey?: string): {
    title: string;
    passages: Passage[];
};
export {};
//# sourceMappingURL=bookLayoutService.d.ts.map