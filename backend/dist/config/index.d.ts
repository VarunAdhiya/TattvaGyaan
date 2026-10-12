export declare const config: {
    port: number;
    nodeEnv: string;
    database: {
        url: string;
        prismaUrl: string;
        connectionLimit: number;
        sessionPool: {
            connectionString: string;
            max: number;
            connectionTimeoutMillis: number;
            idleTimeoutMillis: number;
        };
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
};
//# sourceMappingURL=index.d.ts.map