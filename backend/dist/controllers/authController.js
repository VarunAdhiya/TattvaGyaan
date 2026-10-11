"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const authService_1 = require("../services/authService");
class AuthController {
    async register(req, res, next) {
        try {
            const user = await authService_1.authService.register(req.body);
            req.session.userId = user.id;
            res.status(201).json({ user });
        }
        catch (err) {
            next(err);
        }
    }
    async login(req, res, next) {
        try {
            const user = await authService_1.authService.login(req.body.email, req.body.password);
            req.session.userId = user.id;
            res.json({ user });
        }
        catch (err) {
            next(err);
        }
    }
    async logout(req, res) {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ error: 'Logout failed' });
            }
            res.clearCookie('tattva.sid');
            res.json({ message: 'Logged out successfully' });
        });
    }
    async getProfile(req, res, next) {
        try {
            const user = await authService_1.authService.getProfile(req.userId);
            res.json({ user });
        }
        catch (err) {
            next(err);
        }
    }
    async updateProfile(req, res, next) {
        try {
            const user = await authService_1.authService.updateProfile(req.userId, req.body);
            res.json({ user });
        }
        catch (err) {
            next(err);
        }
    }
    async me(req, res, next) {
        try {
            if (!req.userId) {
                return res.json({ user: null });
            }
            const user = await authService_1.authService.getProfile(req.userId);
            res.json({ user });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
//# sourceMappingURL=authController.js.map