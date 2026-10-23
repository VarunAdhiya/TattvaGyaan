export declare const EMBEDDING_REVISION = "761b726dd34fb83930e26aab4e9ac3899aa1fa78";
export declare const EMBEDDING_MODEL = "multilingual-e5-small:q8:384:v1:761b726dd34fb83930e26aab4e9ac3899aa1fa78";
export declare const EMBEDDING_DIMENSIONS = 384;
export declare function vectorLiteral(vector: number[]): string;
declare class EmbeddingService {
    private worker?;
    private nextId;
    private pending;
    embed(texts: string[], kind: 'query' | 'passage'): Promise<number[][]>;
    close(): void;
}
export declare const embeddingService: EmbeddingService;
export {};
//# sourceMappingURL=embeddingService.d.ts.map