export declare const config: {
    port: number;
    nodeEnv: string;
    database: {
        url: string;
    };
    session: {
        secret: string;
        maxAge: number;
    };
    openai: {
        apiKey: string;
        model: string;
        embeddingModel: string;
    };
    cors: {
        origin: string;
    };
    rateLimit: {
        windowMs: number;
        max: number;
    };
    aiRateLimit: {
        windowMs: number;
        max: number;
    };
};
//# sourceMappingURL=index.d.ts.map