const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../dist/lib/prisma').default;
const { libraryRagService, validateLibraryAnswer, fuseHits, keywordQuery, mentionedBooks, referenceTerms } = require('../dist/services/libraryRagService');
const { splitPassage, sourceHash } = require('../dist/services/ragChunks');
const { embeddingService, vectorLiteral } = require('../dist/services/embeddingService');
const { aiService } = require('../dist/services/aiService');
const { libraryQuestionSchema } = require('../dist/validators/aiSchema');
const { config } = require('../dist/config');
let restore;
function mock(target, key, value) { const old = target[key]; restore.push(() => { target[key] = old; }); target[key] = value; }
beforeEach(() => { restore = []; });
afterEach(() => restore.reverse().forEach(fn => fn()));

test('chunks preserve all source text and exact offsets, including Devanagari', () => {
  const text = ('कर्म और फल — मूल पाठ।\nSecond source line. 🌸 ').repeat(100);
  const chunks = splitPassage(text);
  assert.ok(chunks.length > 1);
  const covered = new Uint8Array(text.length);
  for (const chunk of chunks) {
    assert.equal(text.slice(chunk.start, chunk.end), chunk.text);
    assert.ok(chunk.text.length <= 600);
    covered.fill(1, chunk.start, chunk.end);
  }
  assert.ok(covered.every(Boolean));
  assert.deepEqual(splitPassage(''), []);
  assert.throws(() => splitPassage('abc', 600, 700));
});
test('hybrid ranking combines lists and does not repeat passages', () => {
  const semantic = [{ id: 'a', passageId: 'p1' }, { id: 'b', passageId: 'p2' }, { id: 'c', passageId: 'p1' }];
  const results = fuseHits(semantic, [{ id: 'b', passageId: 'p2' }]);
  assert.equal(results[0].id, 'b'); assert.equal(results.length, 2);
  assert.equal(keywordQuery("what about anger? '); DROP TABLE x; --"), 'anger | drop | table');
});
test('invalid vectors cannot enter SQL', () => {
  assert.throws(() => vectorLiteral([NaN])); assert.throws(() => vectorLiteral(Array(384).fill(0)));
  assert.ok(vectorLiteral(Array(384).fill(.1)).startsWith('['));
});
test('explicit book names and Hindi or English verse references guide retrieval', () => {
  assert.deepEqual(mentionedBooks('Compare Gita and महाभारत'), ['bhagavad-gita', 'mahabharata']);
  assert.deepEqual(mentionedBooks('Explain digital libraries'), []);
  assert.deepEqual(referenceTerms('Explain गीता २.४७ and 2:48'), ['2.47', '2:47', '2.48', '2:48']);
});
const source = { id: 'S1', passageId: 'p1', excerpt: 'Original text' };
test('citations must refer to retrieved evidence; uncited answers and malformed JSON fail closed', () => {
  const valid = { answered: true, paragraphs: [{ text: 'Explanation', sourceIds: ['S1'] }] };
  assert.equal(validateLibraryAnswer(JSON.stringify(valid), [source]).sources[0], source);
  for (const value of ['not json', JSON.stringify({ ...valid, paragraphs: [] }), JSON.stringify({ answered: true, paragraphs: [{ text: 'Invented answer', sourceIds: ['S99'] }] })]) {
    assert.throws(() => validateLibraryAnswer(value, [source]), e => e.statusCode === 502);
  }
  assert.deepEqual(validateLibraryAnswer('{"answered":false,"paragraphs":[]}', [source]), { answered: false, paragraphs: [], sources: [] });
});
test('question schema rejects unsupported languages, oversized input and selection fields', () => {
  for (const input of [{ question: ' ' }, { question: 'x'.repeat(1001) }, { question: 'Valid?', responseLang: 'javascript' }, { question: 'Valid?', passageId: 'selection' }]) {
    assert.equal(libraryQuestionSchema.safeParse(input).success, false);
  }
  assert.equal(libraryQuestionSchema.parse({ question: '  धर्म क्या है?  ' }).question, 'धर्म क्या है?');
});
test('retrieval scopes SQL to published editions, excludes stale chunks, and constructs passage links', async () => {
  let editionQuery; const statements = [];
  mock(prisma.scriptureEdition, 'findMany', async query => { editionQuery = query; return [{ id: 'edition1' }]; });
  mock(embeddingService, 'embed', async () => [Array(384).fill(.1)]);
  mock(prisma, '$queryRaw', async query => {
    statements.push(query);
    if (query.sql.includes('count(*)')) return [{ count: 1n }];
    return [{ id: 'chunk1', passageId: 'p1', text: 'Original text', sourceHash: sourceHash('Original text'), similarity: .9, score: .2 }];
  });
  mock(prisma.scripturePassage, 'findMany', async () => [{ id: 'p1', reference: '1.1', text: 'Original text', section: { title: 'Chapter', edition: { id: 'edition1', scriptureId: 'book1', title: 'A comparative study', contentStatus: 'draft', scripture: { title: 'Book' } } } }]);
  const result = await libraryRagService.retrieve('anger', 'edition1');
  assert.equal(editionQuery.where.id, 'edition1'); assert.ok(editionQuery.where.OR.length > 0);
  for (const query of statements) { assert.match(query.sql, /source_hash = md5\(p.text\)/); assert.ok(query.values.includes('edition1')); }
  assert.equal(result[0].href, '/reader/book1/edition1?passage=p1');
  assert.equal(result[0].contentStatus, 'draft');
  mock(prisma.scripturePassage, 'findMany', async () => [{ id: 'p1', text: 'Changed source' }]);
  assert.deepEqual(await libraryRagService.retrieve('anger'), []);
});
test('an empty index fails explicitly instead of falling back to ungrounded chat', async () => {
  mock(prisma.scriptureEdition, 'findMany', async () => [{ id: 'edition' }]);
  mock(prisma, '$queryRaw', async () => [{ count: 0n }]);
  mock(embeddingService, 'embed', async () => { throw new Error('Must not embed'); });
  await assert.rejects(libraryRagService.retrieve('Question'), e => e.statusCode === 503 && /rag:index/.test(e.message));
});
test('no evidence returns a saved abstention without calling a model', async () => {
  mock(config, 'aiProvider', 'groq'); mock(config.groq, 'apiKey', 'test');
  mock(libraryRagService, 'retrieve', async () => []);
  mock(aiService, 'answerLibrary', async () => { throw new Error('Must not generate'); });
  let saved;
  mock(prisma.libraryAnswer, 'create', async query => { saved = query.data; return { id: 'answer1' }; });
  const result = await libraryRagService.ask('owner', { question: 'Unknown?', responseLang: 'hi' });
  assert.equal(saved.userId, 'owner'); assert.equal(result.answered, false); assert.equal(result.sources.length, 0); assert.match(result.message, /प्रमाण/);
});
test('answer history is scoped to its owner and disables changed-source links', async () => {
  let query;
  mock(prisma.libraryAnswer, 'findMany', async q => { query = q; return [{ id: 'a', question: 'Q', result: { sources: [{ ...source, sourceHash: sourceHash('Original text'), href: '/reader/book/edition?passage=p1' }] } }]; });
  mock(prisma.scriptureEdition, 'findMany', async () => [{ id: 'edition' }]);
  mock(prisma.scripturePassage, 'findMany', async () => [{ id: 'p1', text: 'Changed text' }]);
  const results = await libraryRagService.history('owner');
  assert.deepEqual(query.where, { userId: 'owner' }); assert.equal(results[0].sources[0].href, null);
});

test('answers are saved with citations only after their source versions are rechecked', async () => {
  mock(config, 'aiProvider', 'groq'); mock(config.groq, 'apiKey', 'test');
  const evidence = { ...source, sourceHash: sourceHash('Original text'), title: 'Test book', edition: 'Test edition', reference: '1.1', contentStatus: 'draft' };
  mock(libraryRagService, 'retrieve', async () => [evidence]);
  mock(aiService, 'answerLibrary', async () => ({ content: JSON.stringify({ answered: true, paragraphs: [{ text: 'Source-based explanation', sourceIds: ['S1'] }] }), model: 'test-model' }));
  mock(prisma.scripturePassage, 'findMany', async () => [{ id: 'p1', text: 'Original text' }]);
  let saved;
  mock(prisma.libraryAnswer, 'create', async query => { saved = query.data; return { id: 'saved' }; });
  const result = await libraryRagService.ask('owner', { question: 'What does this mean?', responseLang: 'en' });
  assert.equal(result.answered, true); assert.equal(saved.userId, 'owner'); assert.equal(saved.result.sources[0].id, 'S1');
  saved = null;
  mock(prisma.scripturePassage, 'findMany', async () => [{ id: 'p1', text: 'Edited during generation' }]);
  await assert.rejects(libraryRagService.ask('owner', { question: 'What does this mean?', responseLang: 'en' }), e => e.statusCode === 409);
  assert.equal(saved, null);
});
