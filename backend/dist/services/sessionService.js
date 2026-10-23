"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSession = void 0;
exports.createUserSession = createUserSession;
const saveSession = (req) => new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
exports.saveSession = saveSession;
async function createUserSession(req, userId) {
    await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
    req.session.userId = userId;
    await (0, exports.saveSession)(req);
}
//# sourceMappingURL=sessionService.js.map