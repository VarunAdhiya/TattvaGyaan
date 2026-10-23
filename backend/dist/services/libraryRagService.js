"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.libraryRagService = void 0;
exports.validateLibraryAnswer = validateLibraryAnswer;
exports.fuseHits = fuseHits;
exports.keywordQuery = keywordQuery;
exports.mentionedBooks = mentionedBooks;
exports.referenceTerms = referenceTerms;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const errorHandler_1 = require("../middleware/errorHandler");
const readerCatalog_1 = require("./readerCatalog");
const embeddingService_1 = require("./embeddingService");
const ragChunks_1 = require("./ragChunks");
const aiService_1 = require("./aiService");
const config_1 = require("../config");
const answerSchema = zod_1.z.object({
    answered: zod_1.z.boolean(),
    paragraphs: zod_1.z.array(zod_1.z.object({ text: zod_1.z.string().trim().min(1).max(3000), sourceIds: zod_1.z.array(zod_1.z.string()).min(1).max(6) }).strict()).max(5),
}).strict();
function validateLibraryAnswer(content, sources) {
    let parsed;
    try {
        parsed = answerSchema.parse(JSON.parse(content));
    }
    catch {
        throw new errorHandler_1.AppError('The AI returned an incomplete answer. Please try again.', 502);
    }
    if (!parsed.answered)
        return { answered: false, paragraphs: [], sources: [] };
    const allowed = new Set(sources.map(source => source.id));
    if (!parsed.paragraphs.length || parsed.paragraphs.some(p => p.sourceIds.some(id => !allowed.has(id)))) {
        throw new errorHandler_1.AppError('The AI returned a citation that could not be verified. Please try again.', 502);
    }
    const used = new Set(parsed.paragraphs.flatMap(p => p.sourceIds));
    return { answered: true, paragraphs: parsed.paragraphs, sources: sources.filter(s => used.has(s.id)) };
}
function fuseHits(semantic, lexical) {
    const fused = new Map();
    for (const list of [semantic, lexical])
        list.forEach((hit, rank) => {
            const previous = fused.get(hit.id);
            fused.set(hit.id, { ...previous, ...hit, rankScore: (previous?.rankScore || 0) + 1 / (60 + rank + 1) });
        });
    const seen = new Set();
    return [...fused.values()].sort((a, b) => b.rankScore - a.rankScore).filter(hit => {
        if (seen.has(hit.passageId))
            return false;
        seen.add(hit.passageId);
        return true;
    }).slice(0, 6);
}
const stopWords = new Set('what how does do the a an in is about of to and me tell say says book library please मुझे क्या कैसे के की का है हैं में और से पर बारे बताओ बताइए'.split(' '));
function keywordQuery(question) {
    return [...new Set((question.normalize('NFC').toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) || [])
            .filter(term => term.length > 1 && !stopWords.has(term)))].slice(0, 20).join(' | ');
}
function mentionedBooks(question) {
    const patterns = [
        ['bhagavad-gita', /गीता|\bgita\b|\bgeeta\b/iu],
        ['mahabharata', /महाभारत|\bmahabharat(?:a)?\b/iu],
        ['ramayana', /रामायण|\bramayan(?:a)?\b/iu],
        ['garuda-purana', /गरु[ड़ड]़?\s*पुराण|\bgarud(?:a)?\s*puran(?:a)?\b/iu],
        ['shiva-purana', /शिव\s*पुराण|\bshiv(?:a)?\s*puran(?:a)?\b/iu],
        ['manusmriti', /मनुस्मृति|\bmanusmriti\b/iu],
    ];
    return patterns.filter(([, pattern]) => pattern.test(question)).map(([slug]) => slug);
}
function referenceTerms(question) {
    const normalized = question.replace(/[०-९]/g, digit => String(digit.charCodeAt(0) - 0x0966));
    return [...new Set((normalized.match(/\b\d{1,3}[.:]\d{1,3}\b/g) || []).flatMap(ref => [ref.replace(':', '.'), ref.replace('.', ':')]))].slice(0, 10);
}
class LibraryRagService {
    async catalog() {
        const editions = await prisma_1.default.scriptureEdition.findMany({ where: readerCatalog_1.readerEditionWhere,
            select: { id: true, title: true, contentStatus: true, scripture: { select: { title: true } } }, orderBy: { title: 'asc' } });
        if (!editions.length)
            return { editions: [], ready: false, indexedPassages: 0, totalPassages: 0 };
        const counts = await prisma_1.default.$queryRaw(client_1.Prisma.sql `
      SELECT count(*) AS total, count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM passage_search_chunks c WHERE c.passage_id = p.id AND c.model = ${embeddingService_1.EMBEDDING_MODEL} AND c.source_hash = md5(p.text)
      )) AS indexed FROM scripture_passages p JOIN scripture_sections s ON s.id = p.section_id
      WHERE s.edition_id IN (${client_1.Prisma.join(editions.map(e => e.id))})`);
        const totalPassages = Number(counts[0].total);
        const indexedPassages = Number(counts[0].indexed);
        return { editions, ready: indexedPassages > 0, indexedPassages, totalPassages };
    }
    async retrieve(question, editionId) {
        const books = mentionedBooks(question);
        const editions = await prisma_1.default.scriptureEdition.findMany({
            where: { ...readerCatalog_1.readerEditionWhere, ...(editionId ? { id: editionId } : books.length ? { scripture: { slug: { in: books } } } : {}) }, select: { id: true },
        });
        if (!editions.length)
            throw new errorHandler_1.AppError('No published reader edition is available for this selection.', 404);
        const editionIds = editions.map(e => e.id);
        const scope = client_1.Prisma.sql `c.model = ${embeddingService_1.EMBEDDING_MODEL} AND s.edition_id IN (${client_1.Prisma.join(editionIds)}) AND c.source_hash = md5(p.text)`;
        const indexed = await prisma_1.default.$queryRaw(client_1.Prisma.sql `SELECT count(*) FROM passage_search_chunks c
      JOIN scripture_passages p ON p.id = c.passage_id JOIN scripture_sections s ON s.id = p.section_id WHERE ${scope}`);
        if (!Number(indexed[0].count))
            throw new errorHandler_1.AppError('The search index for this selection is not ready. Run npm run rag:index in backend, then try again.', 503);
        const [vector] = await embeddingService_1.embeddingService.embed([question], 'query');
        const literal = (0, embeddingService_1.vectorLiteral)(vector);
        const fields = client_1.Prisma.sql `c.id, c.passage_id AS "passageId", c.text, c.source_hash AS "sourceHash"`;
        const joins = client_1.Prisma.sql `FROM passage_search_chunks c JOIN scripture_passages p ON p.id = c.passage_id JOIN scripture_sections s ON s.id = p.section_id`;
        const terms = keywordQuery(question);
        const references = referenceTerms(question);
        const [semantic, lexical, exact] = await Promise.all([
            prisma_1.default.$queryRaw(client_1.Prisma.sql `SELECT ${fields}, 1 - (c.embedding <=> ${literal}::vector) AS similarity ${joins}
        WHERE ${scope} ORDER BY c.embedding <=> ${literal}::vector, c.id LIMIT 24`),
            terms ? prisma_1.default.$queryRaw(client_1.Prisma.sql `SELECT ${fields}, ts_rank_cd(to_tsvector('simple', c.text), to_tsquery('simple', ${terms})) AS score ${joins}
        WHERE ${scope} AND to_tsvector('simple', c.text) @@ to_tsquery('simple', ${terms})
        ORDER BY score DESC, c.id LIMIT 24`) : Promise.resolve([]),
            references.length ? prisma_1.default.$queryRaw(client_1.Prisma.sql `SELECT ${fields} ${joins}
        WHERE ${scope} AND p.reference IN (${client_1.Prisma.join(references)}) ORDER BY c.start_offset, c.id LIMIT 6`) : Promise.resolve([]),
        ]);
        // E5 similarities aren't probabilities. Conservative prefilter plus model
        // abstention; benchmark these retrieval decisions with rag:eval.
        const ranked = fuseHits(semantic.filter(hit => (hit.similarity || 0) >= 0.76), lexical);
        const selected = new Set();
        const hits = [...exact, ...ranked].filter(hit => {
            if (selected.has(hit.passageId))
                return false;
            selected.add(hit.passageId);
            return true;
        }).slice(0, 6);
        if (!hits.length)
            return [];
        const passages = await prisma_1.default.scripturePassage.findMany({ where: { id: { in: hits.map(h => h.passageId) }, section: { editionId: { in: editionIds } } },
            include: { section: { include: { edition: { include: { scripture: true } } } } } });
        return hits.flatMap((hit, index) => {
            const passage = passages.find(p => p.id === hit.passageId);
            if (!passage || (0, ragChunks_1.sourceHash)(passage.text) !== hit.sourceHash || !passage.text.includes(hit.text))
                return [];
            const edition = passage.section.edition;
            return [{ id: `S${index + 1}`, passageId: passage.id, editionId: edition.id, scriptureId: edition.scriptureId,
                    title: edition.scripture.title, edition: edition.title, section: passage.section.title, reference: passage.reference,
                    excerpt: hit.text, contentStatus: edition.contentStatus, sourceHash: hit.sourceHash,
                    href: `/reader/${encodeURIComponent(edition.scriptureId)}/${encodeURIComponent(edition.id)}?passage=${encodeURIComponent(passage.id)}` }];
        });
    }
    async ask(userId, input) {
        // Fail immediately for missing configuration, before costly retrieval.
        if (!(config_1.config.aiProvider === 'groq' ? config_1.config.groq.apiKey : config_1.config.gemini.apiKey)) {
            throw new errorHandler_1.AppError(`Set ${config_1.config.aiProvider === 'groq' ? 'GROQ_API_KEY' : 'GEMINI_API_KEY'} in backend/.env and restart the backend.`, 503);
        }
        const sources = await this.retrieve(input.question, input.editionId);
        const generated = sources.length ? await aiService_1.aiService.answerLibrary(input.question, input.responseLang, sources.map(s => ({
            id: s.id, title: s.title, edition: s.edition, reference: s.reference, text: s.excerpt, status: s.contentStatus,
        }))) : null;
        const answer = generated ? validateLibraryAnswer(generated.content, sources) : { answered: false, paragraphs: [], sources: [] };
        if (answer.sources.length) {
            const current = await prisma_1.default.scripturePassage.findMany({
                where: { id: { in: answer.sources.map(s => s.passageId) }, section: { edition: readerCatalog_1.readerEditionWhere } },
                select: { id: true, text: true },
            });
            if (answer.sources.some(source => !current.some(p => p.id === source.passageId && (0, ragChunks_1.sourceHash)(p.text) === source.sourceHash))) {
                throw new errorHandler_1.AppError('A supporting source changed while answering. Please ask again for current evidence.', 409);
            }
        }
        const result = { ...answer, provider: config_1.config.aiProvider, model: generated?.model || null,
            message: answer.answered ? '' : input.responseLang === 'hi'
                ? 'उपलब्ध पुस्तक अंशों में इस प्रश्न का पर्याप्त प्रमाण नहीं मिला। किसी विषय, पुस्तक या संदर्भ के साथ प्रश्न दोबारा पूछें।'
                : 'I could not find enough evidence in the available passages to answer this. Try naming a topic, book, or reference.' };
        const saved = await prisma_1.default.libraryAnswer.create({ data: { userId, question: input.question, responseLang: input.responseLang, editionId: input.editionId, result } });
        return { id: saved.id, question: input.question, responseLang: input.responseLang, ...result };
    }
    async history(userId) {
        const answers = await prisma_1.default.libraryAnswer.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 });
        const editions = await prisma_1.default.scriptureEdition.findMany({ where: readerCatalog_1.readerEditionWhere, select: { id: true } });
        const ids = answers.flatMap(a => (a.result.sources || []).map((s) => s.passageId));
        const passages = ids.length ? await prisma_1.default.scripturePassage.findMany({ where: { id: { in: ids }, section: { editionId: { in: editions.map(e => e.id) } } }, select: { id: true, text: true } }) : [];
        return answers.map(answer => {
            const result = answer.result;
            return { id: answer.id, question: answer.question, responseLang: answer.responseLang, ...result,
                sources: (result.sources || []).map((source) => ({ ...source,
                    href: passages.some(p => p.id === source.passageId && (0, ragChunks_1.sourceHash)(p.text) === source.sourceHash) ? source.href : null,
                })) };
        });
    }
}
exports.libraryRagService = new LibraryRagService();
//# sourceMappingURL=libraryRagService.js.map