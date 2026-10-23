type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
};
export declare class AIService {
    private generate;
    private generateGroq;
    answerLibrary(question: string, responseLang: string, sources: {
        id: string;
        title: string;
        edition: string;
        reference: string;
        text: string;
        status: string;
    }[]): Promise<{
        content: string;
        model: string;
        usage: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
        } | undefined;
    }>;
    analyzeReadingPace(params: {
        title: string;
        language: string;
        targetDays: number;
        minutesPerDay?: number;
        groups: {
            id: number;
            titles: string[];
            wordCount: number;
            passageCount: number;
            samples: string[];
        }[];
    }): Promise<{
        model: string;
        summary: string;
        wordsPerMinute: number;
        reflectionPercent: number;
        groups: {
            id: number;
            difficulty: number;
            reason: string;
        }[];
    }>;
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
        usage: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
        } | undefined;
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
        usage: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
        } | undefined;
    }>;
    chat(params: {
        messages: ChatMessage[];
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
        usage: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
        } | undefined;
    }>;
}
export declare const aiService: AIService;
export {};
//# sourceMappingURL=aiService.d.ts.map