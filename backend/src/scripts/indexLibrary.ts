import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { readerEditionWhere } from '../services/readerCatalog';
import { embeddingService, EMBEDDING_MODEL, vectorLiteral } from '../services/embeddingService';
import { splitPassage, sourceHash } from '../services/ragChunks';

async function main() {
  const editions = await prisma.scriptureEdition.findMany({ where: readerEditionWhere, select: { id: true, title: true } });
  if (!editions.length) throw new Error('No published reader editions found. Import the library first.');
  const requested = process.argv.find(arg => arg.startsWith('--edition='))?.slice(10);
  if (requested && !editions.some(edition => edition.id === requested)) throw new Error('Edition is not published in the reader catalog.');
  // Remove only obsolete derived search data, never library text or annotations.
  await prisma.passageSearchChunk.deleteMany({ where: { OR: [
    { model: { not: EMBEDDING_MODEL } }, { passage: { section: { editionId: { notIn: editions.map(e => e.id) } } } },
  ] } });
  let indexed = 0; let skipped = 0;
  for (const edition of editions.filter(e => !requested || e.id === requested)) {
    const passages = await prisma.scripturePassage.findMany({
      where: { section: { editionId: edition.id } }, orderBy: [{ sectionId: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, text: true, searchChunks: { where: { model: EMBEDDING_MODEL }, select: { sourceHash: true } } },
    });
    console.log(`Indexing ${edition.title}: ${passages.length} passages`);
    const changed = passages.filter(passage => {
      const current = passage.searchChunks.length && passage.searchChunks.every(chunk => chunk.sourceHash === sourceHash(passage.text));
      if (current) skipped++;
      return !current;
    });
    for (let offset = 0; offset < changed.length; offset += 64) {
      const batch = changed.slice(offset, offset + 64);
      const chunks = batch.flatMap(p => splitPassage(p.text).map(c => ({ ...c, passageId: p.id, hash: sourceHash(p.text) })));
      const vectors: number[][] = [];
      for (let i = 0; i < chunks.length; i += 8) vectors.push(...await embeddingService.embed(chunks.slice(i, i + 8).map(c => c.text), 'passage'));
      await prisma.$transaction(async tx => {
        const current = await tx.scripturePassage.findMany({ where: { id: { in: batch.map(p => p.id) } }, select: { id: true, text: true } });
        if (batch.some(p => !current.some(c => c.id === p.id && c.text === p.text))) throw new Error('Source changed during indexing; rerun rag:index.');
        await tx.passageSearchChunk.deleteMany({ where: { passageId: { in: batch.map(p => p.id) } } });
        if (chunks.length) await tx.$executeRaw(Prisma.sql`INSERT INTO passage_search_chunks (id, passage_id, source_hash, model, start_offset, end_offset, text, embedding) VALUES ${Prisma.join(chunks.map((chunk, i) => {
          const id = createHash('sha256').update(`${chunk.passageId}:${chunk.hash}:${chunk.start}:${EMBEDDING_MODEL}`).digest('hex');
          return Prisma.sql`(${id}, ${chunk.passageId}, ${chunk.hash}, ${EMBEDDING_MODEL}, ${chunk.start}, ${chunk.end}, ${chunk.text}, ${vectorLiteral(vectors[i])}::vector)`;
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
}).finally(async () => { embeddingService.close(); await prisma.$disconnect(); });
