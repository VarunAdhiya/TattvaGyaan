"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const devotionalService_1 = require("../services/devotionalService");
const devotionalSchema_1 = require("../validators/devotionalSchema");
const router = (0, express_1.Router)();
router.get('/', async (req, res, next) => {
    try {
        res.json(await (0, devotionalService_1.listDevotionals)(devotionalSchema_1.devotionalFilterSchema.parse(req.query)));
    }
    catch (error) {
        next(error);
    }
});
router.get('/calendar', async (req, res, next) => {
    try {
        const { year, month } = devotionalSchema_1.calendarMonthSchema.parse(req.query);
        res.json(await (0, devotionalService_1.getCalendarMonth)(year, month));
    }
    catch (error) {
        next(error);
    }
});
router.get('/:category/:slug', async (req, res, next) => {
    try {
        const { category, slug } = devotionalSchema_1.devotionalParamsSchema.parse(req.params);
        res.json(await (0, devotionalService_1.getDevotional)(category, slug));
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=devotionals.js.map