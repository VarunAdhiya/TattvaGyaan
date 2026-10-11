import OpenAI from 'openai';
export declare class AIService {
    private getClient;
    explainPassage(params: {
        text: string;
        reference: string;
        scriptureTitle: string;
        sourceLang: string;
        responseLang: string;
        style: string;
        context?: string;
        question?: string;
    }): Promise<{
        content: string;
        model: string;
        usage: OpenAI.Completions.CompletionUsage | undefined;
    }>;
    summarizeSection(params: {
        passages: {
            reference: string;
            text: string;
        }[];
        scriptureTitle: string;
        sectionTitle: string;
        sourceLang: string;
        responseLang: string;
    }): Promise<{
        content: string;
        model: string;
        usage: OpenAI.Completions.CompletionUsage | undefined;
    }>;
    chat(params: {
        messages: {
            role: 'user' | 'assistant';
            content: string;
        }[];
        scriptureContext?: {
            title: string;
            edition: string;
            sourceLang: string;
            section?: string;
            passageText?: string;
            passageRef?: string;
        };
        responseLang: string;
    }): Promise<{
        content: string;
        model: string;
        usage: OpenAI.Completions.CompletionUsage | undefined;
    }>;
}
export declare const aiService: AIService;
//# sourceMappingURL=aiService.d.ts.map