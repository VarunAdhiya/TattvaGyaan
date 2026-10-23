"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.libraryAiController = void 0;
const libraryRagService_1 = require("../services/libraryRagService");
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
// Single-process budget; deployment with multiple API replicas should replace
// this with a shared limiter. Entries expire to bound memory use.
const budgets = new Map();
exports.libraryAiController = {
    async catalog(_req, res, next) {
        try {
            res.json(await libraryRagService_1.libraryRagService.catalog());
        }
        catch (error) {
            next(error);
        }
    },
    async ask(req, res, next) {
        const now = Date.now();
        const userId = req.userId;
        for (const [id, entry] of budgets)
            if (entry.until < now && !entry.busy)
                budgets.delete(id);
        const budget = budgets.get(userId) || { count: 0, until: now + 15 * 60000, busy: false };
        if (budget.busy || budget.count >= 20) {
            next(new errorHandler_1.AppError('Please wait before asking another question. The limit is 20 questions per 15 minutes.', 429));
            return;
        }
        budget.busy = true;
        budget.count++;
        budgets.set(userId, budget);
        try {
            res.json(await libraryRagService_1.libraryRagService.ask(userId, req.body));
        }
        catch (error) {
            next(error);
        }
        finally {
            budget.busy = false;
        }
    },
    async history(req, res, next) {
        try {
            res.json({ answers: await libraryRagService_1.libraryRagService.history(req.userId) });
        }
        catch (error) {
            next(error);
        }
    },
    async clearHistory(req, res, next) {
        try {
            await prisma_1.default.libraryAnswer.deleteMany({ where: { userId: req.userId } });
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    },
};
//# sourceMappingURL=libraryAiController.js.map