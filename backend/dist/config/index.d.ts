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
    gemini: {
        apiKey: string;
        model: string;
        timeoutMs: number;
    };
    cors: {
        origin: string;
    };
    rateLimit: {
        windowMs: number;
        max: number;
    };
    authRateLimit: {
        windowMs: number;
        max: number;
    };
    aiRateLimit: {
        windowMs: number;
        max: number;
    };
};
//# sourceMappingURL=index.d.ts.map