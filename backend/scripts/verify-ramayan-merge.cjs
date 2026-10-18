// Read-only verification against the recovery snapshot; prints counts, never private content.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
async function main() {
  const filename = process.argv[2];
  if (!filename) throw new Error('Pass the pre-merge recovery snapshot path.');
  const snapshot = JSON.parse(fs.readFileSync(path.resolve(filename), 'utf8'));
  assert.ok(snapshot.scriptures && snapshot.progress && snapshot.sections);
  const url = new URL(process.env.DATABASE_URL); url.searchParams.set('connection_limit','1');
  const db = new PrismaClient({ datasources:{ db:{ url:url.toString() } } });
  try {
    const canonical = await db.scripture.findUniqueOrThrow({ where:{ slug:'ramayana' },include:{ editions:true } });
    assert.equal(canonical.title,'Ramayan');
    assert.equal(await db.scripture.count({ where:{ slug:'valmiki-ramayana-ramakien-study' } }),0);
    for (const old of snapshot.scriptures.flatMap(s=>s.editions)) {
      const current = canonical.editions.find(e=>e.id===old.id);assert.ok(current);
      assert.deepEqual(JSON.parse(JSON.stringify({ ...current,scriptureId:old.scriptureId })),old);
    }
    for (const [key,model] of [['sections','scriptureSection'],['notes','note'],['bookmarks','bookmark'],['highlights','highlight'],['progress','readingProgress'],['plans','readingPlan'],['conversations','chatConversation']]) {
      for (const old of snapshot[key]) {
        const current = await db[model].findUnique({ where:{ id:old.id },...(key==='plans'?{ include:{ items:true } }:key==='conversations'?{ include:{ messages:true } }:{}) });
        assert.deepEqual(JSON.parse(JSON.stringify(current)),old,`${key} ${old.id}`);
      }
    }
    for (const fingerprint of snapshot.passageFingerprints) {
      const rows = await db.$queryRaw`SELECT count(p.id)::int AS count,
        md5(string_agg(p.id || chr(31) || p.section_id || chr(31) || p.reference || chr(31) || p.sort_order::text || chr(31) || p.text || chr(31) || coalesce(p.source_notes, ''), chr(30) ORDER BY p.id)) AS hash
        FROM scripture_passages p JOIN scripture_sections s ON s.id=p.section_id WHERE s.edition_id=${fingerprint.edition_id}`;
      assert.equal(rows[0].count,fingerprint.count);assert.equal(rows[0].hash,fingerprint.hash);
    }
    console.log(JSON.stringify({ verified:true,editions:canonical.editions.length,preservedPassages:snapshot.passageFingerprints.reduce((n,p)=>n+p.count,0),
      savedRowsPreserved:Object.fromEntries(['notes','bookmarks','highlights','progress','plans','conversations'].map(k=>[k,snapshot[k].length])) }));
  } finally { await db.$disconnect(); }
}
main().catch(e=>{ console.error(e.name?.startsWith('Prisma')?`Database verification failed (${e.code||e.name})`:e.message);process.exitCode=1; });
