"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = exports.AIService = void 0;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../config");
const errorHandler_1 = require("../middleware/errorHandler");
const openai = config_1.config.openai.apiKey
    ? new openai_1.default({ apiKey: config_1.config.openai.apiKey })
    : null;
class AIService {
    getClient() {
        if (!openai) {
            throw new errorHandler_1.AppError('OpenAI API is not configured. Set OPENAI_API_KEY in environment variables.', 503);
        }
        return openai;
    }
    async explainPassage(params) {
        const client = this.getClient();
        const systemPrompt = `You are a knowledgeable, respectful religious scripture assistant for TattvaGyaan, a multilingual scripture library.

Guidelines:
- Ground your explanations in the provided source text. Do not fabricate verses or citations.
- Clearly distinguish direct quotations, paraphrases, and interpretations.
- Acknowledge that interpretations can vary between traditions and schools of thought.
- Clearly label your output as explanatory material, not original scripture.
- If the source content is unavailable or insufficient, admit it honestly.
- Respond in ${params.responseLang}.
- Style: ${params.style === 'simple' ? 'Use simple, accessible language' : params.style === 'detailed' ? 'Provide detailed analysis' : 'Use scholarly language with references'}.
- The original ${params.sourceLang} text must remain unchanged - do not modify it.`;
        const userPrompt = params.question
            ? `Scripture: ${params.scriptureTitle}
Reference: ${params.reference}
Original text (${params.sourceLang}): ${params.text}
${params.context ? `Context: ${params.context}` : ''}

Question: ${params.question}`
            : `Please explain the following passage from ${params.scriptureTitle}.

Reference: ${params.reference}
Original text (${params.sourceLang}): ${params.text}
${params.context ? `Surrounding context: ${params.context}` : ''}

Provide a clear explanation in ${params.responseLang}.`;
        const response = await client.chat.completions.create({
            model: config_1.config.openai.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 2000,
        });
        return {
            content: response.choices[0]?.message?.content || 'No response generated.',
            model: response.model,
            usage: response.usage,
        };
    }
    async summarizeSection(params) {
        const client = this.getClient();
        const passageText = params.passages
            .map(p => `${p.reference}: ${p.text}`)
            .join('\n\n');
        const response = await client.chat.completions.create({
            model: config_1.config.openai.model,
            messages: [
                {
                    role: 'system',
                    content: `You are a scripture summary assistant. Summarize scripture sections accurately and respectfully. Respond in ${params.responseLang}. Clearly label this as a summary, not original scripture. Cite verse references where relevant.`,
                },
                {
                    role: 'user',
                    content: `Summarize this section from ${params.scriptureTitle} - ${params.sectionTitle}:

${passageText}

Provide a concise summary that captures the main themes and teachings.`,
                },
            ],
            temperature: 0.3,
            max_tokens: 1500,
        });
        return {
            content: response.choices[0]?.message?.content || 'No summary generated.',
            model: response.model,
            usage: response.usage,
        };
    }
    async chat(params) {
        const client = this.getClient();
        let systemContent = `You are TattvaGyaan AI, a knowledgeable and respectful multilingual scripture assistant. Respond in ${params.responseLang}.

Guidelines:
- Ground claims in provided source material when available.
- Never fabricate verses or citations.
- Distinguish quotations from interpretations.
- Respect all religious traditions equally.
- Acknowledge varying interpretations.
- Clearly label AI-generated explanations as such.`;
        if (params.scriptureContext) {
            systemContent += `\n\nCurrent context:
Scripture: ${params.scriptureContext.title}
Edition: ${params.scriptureContext.edition}
Language: ${params.scriptureContext.sourceLang}`;
            if (params.scriptureContext.section) {
                systemContent += `\nSection: ${params.scriptureContext.section}`;
            }
            if (params.scriptureContext.passageText) {
                systemContent += `\nSelected passage (${params.scriptureContext.passageRef}): ${params.scriptureContext.passageText}`;
            }
        }
        const response = await client.chat.completions.create({
            model: config_1.config.openai.model,
            messages: [
                { role: 'system', content: systemContent },
                ...params.messages,
            ],
            temperature: 0.4,
            max_tokens: 2000,
            stream: false,
        });
        return {
            content: response.choices[0]?.message?.content || 'No response generated.',
            model: response.model,
            usage: response.usage,
        };
    }
}
exports.AIService = AIService;
exports.aiService = new AIService();
//# sourceMappingURL=aiService.js.map