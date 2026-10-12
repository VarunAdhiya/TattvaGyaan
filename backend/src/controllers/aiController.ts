import { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/aiService';
import { ragService } from '../services/ragService';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export class AIController {
  async explain(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { passageId, selectedText, question, responseLang, style } = req.body;

      let passageData;
      let contextText = '';

      if (passageId) {
        const context = await ragService.getContextForPassage(passageId);
        if (!context) throw new AppError('Passage not found', 404);
        if (selectedText && !context.target.text.includes(selectedText)) throw new AppError('Selected text must belong to the selected passage', 400);

        passageData = {
          text: selectedText || context.target.text,
          reference: context.target.reference,
          section: context.section,
        };

        contextText = context.context
          .filter((p: any) => p.id !== passageId)
          .map((p: any) => `${p.reference}: ${p.text}`)
          .join('\n');

        const edition = await prisma.scriptureEdition.findUnique({
          where: { id: context.section.editionId },
          include: { scripture: true },
        });

        if (edition) {
          const result = await aiService.explainPassage({
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
        const result = await aiService.chat({
          messages: [{ role: 'user', content: question }],
          responseLang: responseLang || 'en',
        });
        return res.json(result);
      }

      throw new AppError('Either passageId or question is required', 400);
    } catch (err) {
      next(err);
    }
  }

  async summarize(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { editionId, sectionId, responseLang } = req.body;

      if (!sectionId) throw new AppError('Section ID is required', 400);

      const section = await prisma.scriptureSection.findUnique({
        where: { id: sectionId },
        include: {
          passages: { orderBy: { sortOrder: 'asc' } },
          edition: {
            include: { scripture: true },
          },
        },
      });

      if (!section) throw new AppError('Section not found', 404);
      if (section.editionId !== editionId) throw new AppError('Section does not belong to this edition', 400);
      if (!section.passages.length) throw new AppError('No source passages are available for this section', 400);

      const result = await aiService.summarizeSection({
        passages: section.passages.map((p: any) => ({
          reference: p.reference,
          text: p.text,
        })),
        scriptureTitle: section.edition.scripture.title,
        sectionTitle: section.title,
        sourceLang: section.edition.language,
        responseLang: responseLang || 'en',
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async chat(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { question, conversationId, editionId, sectionId, passageId, selectedText, responseLang } = req.body;

      let conversation;
      let messages: { role: 'user' | 'assistant'; content: string }[] = [];

      if (conversationId) {
        conversation = await prisma.chatConversation.findUnique({
          where: { id: conversationId },
          include: {
            messages: { orderBy: { createdAt: 'desc' }, take: 20 },
          },
        });
        if (conversation && conversation.userId !== req.userId) {
          throw new AppError('Access denied', 403);
        }
        if (conversation) {
          if (conversation.editionId !== editionId) throw new AppError('Conversation belongs to another edition', 400);
          messages = conversation.messages.reverse().map((m: any) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));
        }
      }

      if (!conversation) {
        conversation = await prisma.chatConversation.create({
          data: {
            userId: req.userId!,
            editionId,
            title: question.substring(0, 100),
          },
        });
      }

      messages.push({ role: 'user', content: question });

      let scriptureContext;
      if (editionId) {
        const edition = await prisma.scriptureEdition.findUnique({
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
            const passage = await prisma.scripturePassage.findUnique({
              where: { id: passageId },
              include: { section: true },
            });
            if (passage) {
              if (passage.section.editionId !== editionId || (sectionId && passage.sectionId !== sectionId)) {
                throw new AppError('Passage does not belong to the selected section and edition', 400);
              }
              if (selectedText && !passage.text.includes(selectedText)) throw new AppError('Selected text must belong to the selected passage', 400);
              scriptureContext = {
                ...scriptureContext,
                section: passage.section.title,
                passageText: selectedText || passage.text,
                passageRef: passage.reference,
              };
            } else throw new AppError('Passage not found', 404);
          } else if (sectionId) {
            const section = await prisma.scriptureSection.findUnique({
              where: { id: sectionId }, include: { passages: { orderBy: { sortOrder: 'asc' } } },
            });
            if (!section) throw new AppError('Section not found', 404);
            if (section.editionId !== editionId) throw new AppError('Section does not belong to this edition', 400);
            if (!section.passages.length) throw new AppError('No source passages are available for this section', 400);
            scriptureContext = {
              ...scriptureContext,
              section: section.title,
              passageText: section.passages.map(passage => `${passage.reference}: ${passage.text}`).join('\n'),
              passageRef: `Selected section: ${section.title}`,
            };
          }
        } else throw new AppError('Edition not found', 404);
      }

      if (!passageId && !sectionId && editionId) {
        const relevant = await ragService.retrieveForQuestion(question, editionId);
        if (relevant.length > 0 && scriptureContext) {
          scriptureContext = {
            ...scriptureContext,
            passageText: relevant
              .map((r: any) => `${r.reference}: ${r.text}`)
              .join('\n'),
            passageRef: 'Retrieved passages',
          };
        }
      }

      const result = await aiService.chat({
        messages,
        scriptureContext,
        responseLang: responseLang || 'en',
      });

      await prisma.chatMessage.createMany({
        data: [
          {
            conversationId: conversation.id,
            role: 'user',
            content: question,
            passageRef: passageId,
            language: responseLang,
          },
          {
            conversationId: conversation.id,
            role: 'assistant',
            content: result.content,
            language: responseLang,
          },
        ],
      });

      res.json({
        ...result,
        conversationId: conversation.id,
      });
    } catch (err) {
      next(err);
    }
  }

  async getConversations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const conversations = await prisma.chatConversation.findMany({
        where: { userId: req.userId! },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { messages: true } },
        },
      });
      res.json({ conversations });
    } catch (err) {
      next(err);
    }
  }

  async getConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const conversation = await prisma.chatConversation.findUnique({
        where: { id },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
        },
      });
      if (!conversation) throw new AppError('Conversation not found', 404);
      if (conversation.userId !== req.userId) throw new AppError('Access denied', 403);

      res.json({ conversation });
    } catch (err) {
      next(err);
    }
  }

  async deleteConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const conversation = await prisma.chatConversation.findUnique({
        where: { id },
      });
      if (!conversation) throw new AppError('Conversation not found', 404);
      if (conversation.userId !== req.userId) throw new AppError('Access denied', 403);

      await prisma.chatConversation.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

export const aiController = new AIController();
