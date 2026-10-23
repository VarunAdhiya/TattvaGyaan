// Read-only retrieval checks against the published Gita edition. No generated
// answer is accepted as ground truth; references are assessed independently.
process.env.NODE_ENV = 'production';
const assert = require('node:assert/strict');
const prisma = require('../dist/lib/prisma').default;
const { libraryRagService } = require('../dist/services/libraryRagService');
const { embeddingService } = require('../dist/services/embeddingService');
const { readerEditionWhere } = require('../dist/services/readerCatalog');
const { aiService } = require('../dist/services/aiService');
const { validateLibraryAnswer } = require('../dist/services/libraryRagService');
const cases = [
  { question: 'What does the Gita say about doing your duty without attachment to results?', expected: ['2.47', '2.48', '3.19'] },
  { question: 'कर्म और उसके फल के बारे में गीता क्या कहती है?', expected: ['2.47', '2.48', '3.19', '5.12'] },
  { question: 'क्रोध से क्या हानि होती है?', expected: ['2.62', '2.63', '16.21'] },
  { question: 'Explain Gita 2.47 in simple words', expected: ['2.47'] },
];
(async () => {
  const edition = await prisma.scriptureEdition.findFirstOrThrow({ where: { ...readerEditionWhere, scripture: { slug: 'bhagavad-gita' } } });
  let failed = 0;
  for (const entry of cases) {
    const sources = await libraryRagService.retrieve(entry.question, edition.id);
    const references = sources.map(s => s.reference);
    const passed = entry.expected.some(ref => references.includes(ref));
    console.log(JSON.stringify({ question: entry.question, references, passed }));
    if (!passed) failed++;
    for (const source of sources) {
      const passage = await prisma.scripturePassage.findUniqueOrThrow({ where: { id: source.passageId } });
      assert.ok(passage.text.includes(source.excerpt), 'Citation excerpt must match source');
      assert.equal(source.editionId, edition.id);
    }
  }
  assert.equal(failed, 0, 'Retrieval benchmark failed');
  if (process.argv.includes('--answers')) {
    for (const [question, expected] of [[cases[1].question, true], ['What is the latest price of Bitcoin?', false]]) {
      const sources = await libraryRagService.retrieve(question, edition.id);
      const response = await aiService.answerLibrary(question, 'hi', sources.map(s => ({ id: s.id, title: s.title, edition: s.edition, reference: s.reference, text: s.excerpt, status: s.contentStatus })));
      const answer = validateLibraryAnswer(response.content, sources);
      assert.equal(answer.answered, expected);
      console.log(JSON.stringify({ question, answered: answer.answered, citedReferences: answer.sources.map(s => s.reference), model: response.model }));
    }
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => { embeddingService.close(); await prisma.$disconnect(); });
