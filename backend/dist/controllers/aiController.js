"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiController = exports.AIController = void 0;
const aiService_1 = require("../services/aiService");
const ragService_1 = require("../services/ragService");
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const node_crypto_1 = require("node:crypto");
class AIController {
    async explain(req, res, next) {
        try {
            const { passageId, selectedText, question, responseLang, style } = req.body;
            let passageData;
            let contextText = '';
            if (passageId) {
                const context = await ragService_1.ragService.getContextForPassage(passageId);
                if (!context)
                    throw new errorHandler_1.AppError('Passage not found', 404);
                if (selectedText && !context.target.text.includes(selectedText))
                    throw new errorHandler_1.AppError('Selected text must belong to the selected passage', 400);
                passageData = {
                    text: selectedText || context.target.text,
                    reference: context.target.reference,
                    section: context.section,
                };
                contextText = context.context
                    .filter((p) => p.id !== passageId)
                    .map((p) => `${p.reference}: ${p.text}`)
                    .join('\n');
                const edition = await prisma_1.default.scriptureEdition.findUnique({
                    where: { id: context.section.editionId },
                    include: { scripture: true },
                });
                if (edition) {
                    const result = await aiService_1.aiService.explainPassage({
                        text: passageData.text,
                        reference: passageData.reference,
                        scriptureTitle: edition.scripture.title,
                        sourceLang: edition.language,
                        responseLang: responseLang || 'en',
                        style: style || 'simple',
                        context: contextText || undefined,
                        question,
                    });
                    return res.json(result);
                }
            }
            // Fallback for questions without passage context
            if (question) {
                const result = await aiService_1.aiService.chat({
                    messages: [{ role: 'user', content: question }],
                    responseLang: responseLang || 'en',
                });
                return res.json(result);
            }
            throw new errorHandler_1.AppError('Either passageId or question is required', 400);
        }
        catch (err) {
            next(err);
        }
    }
    async summarize(req, res, next) {
        try {
            const { editionId, sectionId, responseLang } = req.body;
            if (!sectionId)
                throw new errorHandler_1.AppError('Section ID is required', 400);
            const section = await prisma_1.default.scriptureSection.findUnique({
                where: { id: sectionId },
                include: {
                    passages: { orderBy: { sortOrder: 'asc' } },
                    edition: {
                        include: { scripture: true },
                    },
                },
            });
            if (!section)
                throw new errorHandler_1.AppError('Section not found', 404);
            if (section.editionId !== editionId)
                throw new errorHandler_1.AppError('Section does not belong to this edition', 400);
            if (!section.passages.length)
                throw new errorHandler_1.AppError('No source passages are available for this section', 400);
            const result = await aiService_1.aiService.summarizeSection({
                passages: section.passages.map((p) => ({
                    reference: p.reference,
                    text: p.text,
                })),
                scriptureTitle: section.edition.scripture.title,
                sectionTitle: section.title,
                sourceLang: section.edition.language,
                responseLang: responseLang || 'en',
            });
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    async chat(req, res, next) {
        try {
            const { question, conversationId, editionId, sectionId, passageId, selectedText, responseLang } = req.body;
            if ((sectionId || passageId) && !editionId)
                throw new errorHandler_1.AppError('Edition is required for selected text', 400);
            if (selectedText && !passageId)
                throw new errorHandler_1.AppError('Select a passage before sending selected text', 400);
            if (editionId && !sectionId && !passageId)
                throw new errorHandler_1.AppError('Select a passage or section before asking about this book', 400);
            const contextKey = (0, node_crypto_1.createHash)('sha256').update(JSON.stringify([editionId, sectionId, passageId, selectedText])).digest('hex');
            let conversation;
            let messages = [];
            if (conversationId) {
                conversation = await prisma_1.default.chatConversation.findUnique({
                    where: { id: conversationId },
                    include: {
                        messages: { orderBy: { createdAt: 'desc' }, take: 20 },
                    },
                });
                if (conversation && conversation.userId !== req.userId) {
                    throw new errorHandler_1.AppError('Access denied', 403);
                }
                if (conversation) {
                    if (conversation.editionId !== editionId)
                        throw new errorHandler_1.AppError('Conversation belongs to another edition', 400);
                    messages = conversation.messages.reverse().filter(message => message.passageRef === contextKey).map((m) => ({
                        role: m.role,
                        content: m.content,
                    }));
                }
            }
            messages.push({ role: 'user', content: question });
            let scriptureContext;
            if (editionId) {
                const edition = await prisma_1.default.scriptureEdition.findUnique({
                    where: { id: editionId },
                    include: { scripture: true },
                });
                if (edition) {
                    scriptureContext = {
                        title: edition.scripture.title,
                        edition: edition.title,
                        sourceLang: edition.language,
                    };
                    if (passageId) {
                        const passage = await prisma_1.default.scripturePassage.findUnique({
                            where: { id: passageId },
                            include: { section: true },
                        });
                        if (passage) {
                            if (passage.section.editionId !== editionId || (sectionId && passage.sectionId !== sectionId)) {
                                throw new errorHandler_1.AppError('Passage does not belong to the selected section and edition', 400);
                            }
                            if (selectedText && !passage.text.includes(selectedText))
                                throw new errorHandler_1.AppError('Selected text must belong to the selected passage', 400);
                            scriptureContext = {
                                ...scriptureContext,
                                section: passage.section.title,
                                passageText: selectedText || passage.text,
                                passageRef: passage.reference,
                            };
                        }
                        else
                            throw new errorHandler_1.AppError('Passage not found', 404);
                    }
                    else if (sectionId) {
                        const section = await prisma_1.default.scriptureSection.findUnique({
                            where: { id: sectionId }, include: { passages: { orderBy: { sortOrder: 'asc' } } },
                        });
                        if (!section)
                            throw new errorHandler_1.AppError('Section not found', 404);
                        if (section.editionId !== editionId)
                            throw new errorHandler_1.AppError('Section does not belong to this edition', 400);
                        if (!section.passages.length)
                            throw new errorHandler_1.AppError('No source passages are available for this section', 400);
                        scriptureContext = {
                            ...scriptureContext,
                            section: section.title,
                            passageText: section.passages.map(passage => `${passage.reference}: ${passage.text}`).join('\n'),
                            passageRef: `Selected section: ${section.title}`,
                        };
                    }
                }
                else
                    throw new errorHandler_1.AppError('Edition not found', 404);
            }
            const result = await aiService_1.aiService.chat({
                messages,
                scriptureContext,
                responseLang: responseLang || 'en',
            });
            if (!conversation) {
                conversation = await prisma_1.default.chatConversation.create({
                    data: { userId: req.userId, editionId, title: question.substring(0, 100) },
                });
            }
            await prisma_1.default.chatMessage.createMany({
                data: [
                    {
                        conversationId: conversation.id,
                        role: 'user',
                        content: question,
                        passageRef: contextKey,
                        language: responseLang,
                    },
                    {
                        conversationId: conversation.id,
                        role: 'assistant',
                        content: result.content,
                        passageRef: contextKey,
                        language: responseLang,
                    },
                ],
            });
            res.json({
                ...result,
                conversationId: conversation.id,
            });
        }
        catch (err) {
            next(err);
        }
    }
    async getConversations(req, res, next) {
        try {
            const conversations = await prisma_1.default.chatConversation.findMany({
                where: { userId: req.userId },
                orderBy: { updatedAt: 'desc' },
                include: {
                    _count: { select: { messages: true } },
                },
            });
            res.json({ conversations });
        }
        catch (err) {
            next(err);
        }
    }
    async getConversation(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const conversation = await prisma_1.default.chatConversation.findUnique({
                where: { id },
                include: {
                    messages: { orderBy: { createdAt: 'asc' } },
                },
            });
            if (!conversation)
                throw new errorHandler_1.AppError('Conversation not found', 404);
            if (conversation.userId !== req.userId)
                throw new errorHandler_1.AppError('Access denied', 403);
            res.json({ conversation });
        }
        catch (err) {
            next(err);
        }
    }
    async deleteConversation(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const conversation = await prisma_1.default.chatConversation.findUnique({
                where: { id },
            });
            if (!conversation)
                throw new errorHandler_1.AppError('Conversation not found', 404);
            if (conversation.userId !== req.userId)
                throw new errorHandler_1.AppError('Access denied', 403);
            await prisma_1.default.chatConversation.delete({ where: { id } });
            res.status(204).send();
        }
        catch (err) {
            next(err);
        }
    }
}
exports.AIController = AIController;
exports.aiController = new AIController();
//# sourceMappingURL=aiController.js.map