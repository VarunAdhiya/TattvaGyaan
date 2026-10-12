"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiController_1 = require("../controllers/aiController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const aiSchema_1 = require("../validators/aiSchema");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.post('/explain', (0, validate_1.validate)(aiSchema_1.explainSchema), aiController_1.aiController.explain);
router.post('/summarize', (0, validate_1.validate)(aiSchema_1.summarizeSchema), aiController_1.aiController.summarize);
router.post('/chat', (0, validate_1.validate)(aiSchema_1.askQuestionSchema), aiController_1.aiController.chat);
router.get('/conversations', aiController_1.aiController.getConversations);
router.get('/conversations/:id', aiController_1.aiController.getConversation);
router.delete('/conversations/:id', aiController_1.aiController.deleteConversation);
exports.default = router;
//# sourceMappingURL=ai.js.map