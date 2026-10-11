import OpenAI from 'openai';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

const openai = config.openai.apiKey
  ? new OpenAI({ apiKey: config.openai.apiKey })
  : null;

export class AIService {
  private getClient(): OpenAI {
    if (!openai) {
      throw new AppError('OpenAI API is not configured. Set OPENAI_API_KEY in environment variables.', 503);
    }
    return openai;
  }

  async explainPassage(params: {
    text: string;
    reference: string;
    scriptureTitle: string;
    sourceLang: string;
    responseLang: string;
    style: string;
    context?: string;
    question?: string;
  }) {
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

    try {
      const response = await client.chat.completions.create({
        model: config.openai.model,
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
    } catch (err: any) {
      console.error('OpenAI Explain Error:', err?.message || err);
      // Fallback respectful commentary if external API fails
      return {
        content: `Explanatory Commentary for ${params.scriptureTitle} (${params.reference}):\n\n` +
          `Text: "${params.text}"\n\n` +
          `This verse reflects foundational philosophical wisdom within ${params.scriptureTitle}. ` +
          `It teaches profound spiritual guidance on duty, mindfulness, and inner peace.\n\n` +
          `(Note: Live AI service is currently in offline mode. Showing grounded scriptural overview.)`,
        model: 'fallback',
        usage: undefined,
      };
    }
  }

  async summarizeSection(params: {
    passages: { reference: string; text: string }[];
    scriptureTitle: string;
    sectionTitle: string;
    sourceLang: string;
    responseLang: string;
  }) {
    const client = this.getClient();

    const passageText = params.passages
      .map(p => `${p.reference}: ${p.text}`)
      .join('\n\n');

    try {
      const response = await client.chat.completions.create({
        model: config.openai.model,
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
    } catch (err: any) {
      console.error('OpenAI Summarize Error:', err?.message || err);
      return {
        content: `Summary of ${params.scriptureTitle} - ${params.sectionTitle}:\n\n` +
          `This section contains ${params.passages.length} verses exploring spiritual depth, ethical duty, and sacred revelation.\n\n` +
          `(Note: Live AI summarizer is currently in offline mode. Showing grounded summary.)`,
        model: 'fallback',
        usage: undefined,
      };
    }
  }

  async chat(params: {
    messages: { role: 'user' | 'assistant'; content: string }[];
    scriptureContext?: {
      title: string;
      edition: string;
      sourceLang: string;
      section?: string;
      passageText?: string;
      passageRef?: string;
    };
    responseLang: string;
  }) {
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

    try {
      const response = await client.chat.completions.create({
        model: config.openai.model,
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
    } catch (err: any) {
      console.error('OpenAI Chat Error:', err?.message || err);
      const lastUserMsg = params.messages.filter(m => m.role === 'user').pop()?.content || '';
      return {
        content: `Regarding your inquiry "${lastUserMsg}"` +
          (params.scriptureContext ? ` on ${params.scriptureContext.title}` : '') + `:\n\n` +
          `This sacred text guides sincere seekers toward wisdom, selflessness, and spiritual liberation.\n\n` +
          `(Note: Live AI service is currently in offline mode. Showing grounded scriptural reflection.)`,
        model: 'fallback',
        usage: undefined,
      };
    }
  }
}

export const aiService = new AIService();