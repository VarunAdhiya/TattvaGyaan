"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
const prisma_1 = __importDefault(require("./lib/prisma"));
async function main() {
    try {
        await prisma_1.default.$connect();
        console.log('Database connected');
        app_1.default.listen(config_1.config.port, () => {
            console.log(`Server running on port ${config_1.config.port}`);
            console.log(`Environment: ${config_1.config.nodeEnv}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map