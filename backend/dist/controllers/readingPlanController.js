"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readingPlanController = exports.ReadingPlanController = void 0;
const readingPlanService_1 = require("../services/readingPlanService");
class ReadingPlanController {
    async createPlan(req, res, next) {
        try {
            const { editionId, title, targetDays, startDate, minutesPerDay } = req.body;
            const plan = await readingPlanService_1.readingPlanService.createPlan(req.userId, {
                editionId,
                title,
                targetDays,
                startDate,
                minutesPerDay,
            });
            res.status(201).json({ plan });
        }
        catch (err) {
            next(err);
        }
    }
    async getUserPlans(req, res, next) {
        try {
            const plans = await readingPlanService_1.readingPlanService.getUserPlans(req.userId);
            res.json({ plans });
        }
        catch (err) {
            next(err);
        }
    }
    async getPlan(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const plan = await readingPlanService_1.readingPlanService.getPlan(id, req.userId);
            res.json({ plan });
        }
        catch (err) {
            next(err);
        }
    }
    async updatePlan(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const { status, targetDays } = req.body;
            const plan = await readingPlanService_1.readingPlanService.updatePlan(id, req.userId, { status, targetDays });
            res.json({ plan });
        }
        catch (err) {
            next(err);
        }
    }
    async completePlanItem(req, res, next) {
        try {
            const id = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
            const { completed } = req.body;
            const item = await readingPlanService_1.readingPlanService.completePlanItem(id, req.userId, completed);
            res.json({ item });
        }
        catch (err) {
            next(err);
        }
    }
    async deletePlan(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            await readingPlanService_1.readingPlanService.deletePlan(id, req.userId);
            res.status(204).send();
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ReadingPlanController = ReadingPlanController;
exports.readingPlanController = new ReadingPlanController();
//# sourceMappingURL=readingPlanController.js.map