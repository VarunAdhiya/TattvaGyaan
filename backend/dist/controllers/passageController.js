"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passageController = exports.PassageController = void 0;
const scriptureService_1 = require("../services/scriptureService");
class PassageController {
    async getBySection(req, res, next) {
        try {
            const sectionId = Array.isArray(req.params.sectionId) ? req.params.sectionId[0] : req.params.sectionId;
            const result = await scriptureService_1.scriptureService.getSectionPassages(sectionId, parseInt(req.query.page) || 1, parseInt(req.query.limit) || 50);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    async getOne(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const passage = await scriptureService_1.scriptureService.getPassage(id);
            res.json({ passage });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.PassageController = PassageController;
exports.passageController = new PassageController();
//# sourceMappingURL=passageController.js.map