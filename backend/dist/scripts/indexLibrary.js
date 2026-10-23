"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../lib/prisma"));
const client_1 = require("@prisma/client");
const node_crypto_1 = require("node:crypto");
const readerCatalog_1 = require("../services/readerCatalog");
const embeddingService_1 = require("../services/embeddingService");
const ragChunks_1 = require("../services/ragChunks");
async function main() {
    const editions = await prisma_1.default.scriptureEdition.findMany({ where: readerCatalog_1.readerEditionWhere, select: { id: true, title: true } });
    if (!editions.length)
        throw new Error('No published reader editions found. Import the library first.');
    const requested = process.argv.find(arg => arg.startsWith('--edition='))?.slice(10);
    if (requested && !editions.some(edition => edition.id === requested))
        throw new Error('Edition is not published in the reader catalog.');
    // Remove only obsolete derived search data, never library text or annotations.
    await prisma_1.default.passageSearchChunk.deleteMany({ where: { OR: [
                { model: { not: embeddingService_1.EMBEDDING_MODEL } }, { passage: { section: { editionId: { notIn: editions.map(e => e.id) } } } },
            ] } });
    let indexed = 0;
    let skipped = 0;
    for (const edition of editions.filter(e => !requested || e.id === requested)) {
        const passages = await prisma_1.default.scripturePassage.findMany({
            where: { section: { editionId: edition.id } }, orderBy: [{ sectionId: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
            select: { id: true, text: true, searchChunks: { where: { model: embeddingService_1.EMBEDDING_MODEL }, select: { sourceHash: true } } },
        });
        console.log(`Indexing ${edition.title}: ${passages.length} passages`);
        const changed = passages.filter(passage => {
            const current = passage.searchChunks.length && passage.searchChunks.every(chunk => chunk.sourceHash === (0, ragChunks_1.sourceHash)(passage.text));
            if (current)
                skipped++;
            return !current;
        });
        for (let offset = 0; offset < changed.length; offset += 64) {
            const batch = changed.slice(offset, offset + 64);
            const chunks = batch.flatMap(p => (0, ragChunks_1.splitPassage)(p.text).map(c => ({ ...c, passageId: p.id, hash: (0, ragChunks_1.sourceHash)(p.text) })));
            const vectors = [];
            for (let i = 0; i < chunks.length; i += 8)
                vectors.push(...await embeddingService_1.embeddingService.embed(chunks.slice(i, i + 8).map(c => c.text), 'passage'));
            await prisma_1.default.$transaction(async (tx) => {
                const current = await tx.scripturePassage.findMany({ where: { id: { in: batch.map(p => p.id) } }, select: { id: true, text: true } });
                if (batch.some(p => !current.some(c => c.id === p.id && c.text === p.text)))
                    throw new Error('Source changed during indexing; rerun rag:index.');
                await tx.passageSearchChunk.deleteMany({ where: { passageId: { in: batch.map(p => p.id) } } });
                if (chunks.length)
                    await tx.$executeRaw(client_1.Prisma.sql `INSERT INTO passage_search_chunks (id, passage_id, source_hash, model, start_offset, end_offset, text, embedding) VALUES ${client_1.Prisma.join(chunks.map((chunk, i) => {
                        const id = (0, node_crypto_1.createHash)('sha256').update(`${chunk.passageId}:${chunk.hash}:${chunk.start}:${embeddingService_1.EMBEDDING_MODEL}`).digest('hex');
                        return client_1.Prisma.sql `(${id}, ${chunk.passageId}, ${chunk.hash}, ${embeddingService_1.EMBEDDING_MODEL}, ${chunk.start}, ${chunk.end}, ${chunk.text}, ${(0, embeddingService_1.vectorLiteral)(vectors[i])}::vector)`;
                    }))}`);
            }, { timeout: 30000 });
            indexed += batch.length;
            console.log(`Indexed ${indexed}; unchanged ${skipped}`);
        }
    }
    console.log(`Search index ready. Indexed ${indexed}; unchanged ${skipped}.`);
}
main().catch(error => {
    console.error(error instanceof Error && /Source changed|Edition is not|No published/.test(error.message) ? error.message : 'Indexing failed. Check migrations, model download access, and database connectivity. It is safe to rerun rag:index.');
    process.exitCode = 1;
}).finally(async () => { embeddingService_1.embeddingService.close(); await prisma_1.default.$disconnect(); });
//# sourceMappingURL=indexLibrary.js.map