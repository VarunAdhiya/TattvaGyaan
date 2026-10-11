"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const authSchema_1 = require("../validators/authSchema");
const router = (0, express_1.Router)();
router.post('/register', (0, validate_1.validate)(authSchema_1.registerSchema), authController_1.authController.register);
router.post('/login', (0, validate_1.validate)(authSchema_1.loginSchema), authController_1.authController.login);
router.post('/logout', authController_1.authController.logout);
router.get('/me', auth_1.optionalAuth, authController_1.authController.me);
router.get('/profile', auth_1.requireAuth, authController_1.authController.getProfile);
router.patch('/profile', auth_1.requireAuth, (0, validate_1.validate)(authSchema_1.updateProfileSchema), authController_1.authController.updateProfile);
exports.default = router;
//# sourceMappingURL=auth.js.map