"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
const errorHandler_1 = require("./errorHandler");
function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        throw new errorHandler_1.AppError('Authentication required', 401);
    }
    req.userId = req.session.userId;
    next();
}
function optionalAuth(req, _res, next) {
    if (req.session && req.session.userId) {
        req.userId = req.session.userId;
    }
    next();
}
//# sourceMappingURL=auth.js.map