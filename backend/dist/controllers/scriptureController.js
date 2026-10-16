"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scriptureController = exports.ScriptureController = void 0;
const scriptureService_1 = require("../services/scriptureService");
class ScriptureController {
    async getAll(req, res, next) {
        try {
            const result = await scriptureService_1.scriptureService.getScriptures({
                religionId: req.query.religionId,
                language: req.query.language,
                search: req.query.search,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
            });
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    async getOne(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const scripture = await scriptureService_1.scriptureService.getScripture(id);
            res.json({ scripture });
        }
        catch (err) {
            next(err);
        }
    }
    async getEdition(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const edition = await scriptureService_1.scriptureService.getEdition(id);
            res.json({ edition });
        }
        catch (err) {
            next(err);
        }
    }
    async getEditions(req, res, next) {
        try {
            const scriptureId = Array.isArray(req.params.scriptureId) ? req.params.scriptureId[0] : req.params.scriptureId;
            const editions = await scriptureService_1.scriptureService.getEditionsByScripture(scriptureId);
            res.json({ editions });
        }
        catch (err) {
            next(err);
        }
    }
    async getReaderContent(req, res, next) {
        try {
            const editionId = Array.isArray(req.params.editionId) ? req.params.editionId[0] : req.params.editionId;
            const sections = await scriptureService_1.scriptureService.getPassagesForReader(editionId, true);
            res.json({ sections });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ScriptureController = ScriptureController;
exports.scriptureController = new ScriptureController();
//# sourceMappingURL=scriptureController.js.map