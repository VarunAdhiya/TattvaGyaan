export declare function createDatabaseConfig(env: NodeJS.ProcessEnv): {
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
//# sourceMappingURL=database.d.ts.map