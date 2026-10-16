"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importStar(require("./app"));
const config_1 = require("./config");
const prisma_1 = __importDefault(require("./lib/prisma"));
async function main() {
    try {
        await prisma_1.default.$connect();
        console.log('Database connected');
        const server = app_1.default.listen(config_1.config.port, () => {
            console.log(`Server running on port ${config_1.config.port}`);
            console.log(`Environment: ${config_1.config.nodeEnv}`);
        });
        let shuttingDown = false;
        const shutdown = async () => {
            if (shuttingDown)
                return;
            shuttingDown = true;
            const deadline = setTimeout(() => process.exit(1), 25000);
            deadline.unref();
            await new Promise(resolve => {
                server.close(() => resolve());
                server.closeIdleConnections();
            });
            await Promise.allSettled([prisma_1.default.$disconnect(), app_1.sessionStore?.close()]);
            clearTimeout(deadline);
            process.exit(0);
        };
        process.once('SIGTERM', shutdown);
        process.once('SIGINT', shutdown);
    }
    catch (error) {
        console.error('Failed to start server:', error);
        await Promise.allSettled([prisma_1.default.$disconnect(), app_1.sessionStore?.close()]);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map