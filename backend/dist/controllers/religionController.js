"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.religionController = exports.ReligionController = void 0;
const scriptureService_1 = require("../services/scriptureService");
class ReligionController {
    async getAll(req, res, next) {
        try {
            const religions = await scriptureService_1.scriptureService.getReligions();
            res.json({ religions });
        }
        catch (err) {
            next(err);
        }
    }
    async getOne(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const religion = await scriptureService_1.scriptureService.getReligion(id);
            res.json({ religion });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.ReligionController = ReligionController;
exports.religionController = new ReligionController();
//# sourceMappingURL=religionController.js.map