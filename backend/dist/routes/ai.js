"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiController_1 = require("../controllers/aiController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const aiSchema_1 = require("../validators/aiSchema");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("../config");
const aiLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.aiRateLimit.windowMs,
    max: config_1.config.aiRateLimit.max,
    skip: (req) => config_1.config.nodeEnv !== 'production' || req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
    message: { error: 'Too many AI requests. Please try again later.' },
});
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.use(aiLimiter);
router.post('/explain', (0, validate_1.validate)(aiSchema_1.explainSchema), aiController_1.aiController.explain);
router.post('/summarize', (0, validate_1.validate)(aiSchema_1.summarizeSchema), aiController_1.aiController.summarize);
router.post('/chat', (0, validate_1.validate)(aiSchema_1.askQuestionSchema), aiController_1.aiController.chat);
router.get('/conversations', aiController_1.aiController.getConversations);
router.get('/conversations/:id', aiController_1.aiController.getConversation);
router.delete('/conversations/:id', aiController_1.aiController.deleteConversation);
exports.default = router;
//# sourceMappingURL=ai.js.map