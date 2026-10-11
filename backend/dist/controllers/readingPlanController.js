"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readingPlanController = exports.ReadingPlanController = void 0;
const readingPlanService_1 = require("../services/readingPlanService");
class ReadingPlanController {
    async create(req, res, next) {
        try {
            const plan = await readingPlanService_1.readingPlanService.createPlan(req.userId, req.body);
            res.status(201).json({ plan });
        }
        catch (err) {
            next(err);
        }
    }
    async getAll(req, res, next) {
        try {
            const plans = await readingPlanService_1.readingPlanService.getUserPlans(req.userId);
            res.json({ plans });
        }
        catch (err) {
            next(err);
        }
    }
    async getOne(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const plan = await readingPlanService_1.readingPlanService.getPlan(id, req.userId);
            res.json({ plan });
        }
        catch (err) {
            next(err);
        }
    }
    async update(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const plan = await readingPlanService_1.readingPlanService.updatePlan(id, req.userId, req.body);
            res.json({ plan });
        }
        catch (err) {
            next(err);
        }
    }
    async delete(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            await readingPlanService_1.readingPlanService.deletePlan(id, req.userId);
            res.status(204).send();
        }
        catch (err) {
            next(err);
        }
    }
    async completeItem(req, res, next) {
        try {
            const itemId = Array.isArray(req.params.itemId) ? req.params.itemId[0] : req.params.itemId;
            const item = await readingPlanService_1.readingPlanService.completePlanItem(itemId, req.userId, req.body.completed);
            res.json({ item });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ReadingPlanController = ReadingPlanController;
exports.readingPlanController = new ReadingPlanController();
//# sourceMappingURL=readingPlanController.js.map