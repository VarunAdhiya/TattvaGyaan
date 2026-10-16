const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../dist/lib/prisma').default;
const { aiController } = require('../dist/controllers/aiController');
const { aiService } = require('../dist/services/aiService');
const { ragService } = require('../dist/services/ragService');
let restore;
let generated;
const edition = { id: 'edition', title: 'Test edition', language: 'en', scripture: { title: 'Test book' } };
const section = { id: 'section', editionId: 'edition', title: 'Selected section', edition,
  passages: Array.from({ length: 61 }, (_, i) => ({ reference: `2.${i + 1}`, text: `Test source ${i + 1}` })) };
function replace(object, method, value) {
  const original = object[method];
  restore.push(() => { object[method] = original; });
  object[method] = value;
}
beforeEach(() => {
  restore = [];
  generated = null;
  replace(prisma.scriptureSection, 'findUnique', async query => ({ ...section, passages: section.passages.slice(0, query.include.passages.take) }));
  replace(prisma.scriptureEdition, 'findUnique', async () => edition);
  replace(prisma.chatConversation, 'create', async () => ({ id: 'conversation' }));
  replace(prisma.chatMessage, 'createMany', async () => ({ count: 2 }));
  for (const method of ['chat', 'summarizeSection']) replace(aiService, method, async params => { generated = params; return { content: 'Test answer' }; });
  replace(ragService, 'retrieveForQuestion', async () => { throw new Error('Selected-section chat must not retrieve unrelated passages'); });
});
afterEach(() => restore.reverse().forEach(reset => reset()));
async function invoke(method, body) {
  const response = {};
  await aiController[method]({ userId: 'user', body }, { json(data) { response.data = data; } }, error => { response.error = error; });
  return response;
}
test('a selected section summary includes all 61 source passages', async () => {
  const result = await invoke('summarize', { editionId: 'edition', sectionId: 'section' });
  assert.equal(result.error, undefined);
  assert.equal(generated.passages.length, 61);
  assert.equal(generated.passages.at(-1).reference, '2.61');
});
test('selected-section chat supplies section text instead of whole-book retrieval', async () => {
  const result = await invoke('chat', { editionId: 'edition', sectionId: 'section', question: 'Summarize this' });
  assert.equal(result.error, undefined);
  assert.match(generated.scriptureContext.passageText, /Test source 61/);
  assert.equal(generated.scriptureContext.section, 'Selected section');
});
test('sections from a different edition cannot be summarized or used in chat', async () => {
  for (const method of ['summarize', 'chat']) {
    const result = await invoke(method, { editionId: 'other-edition', sectionId: 'section', question: 'Summarize this' });
    assert.equal(result.error.statusCode, 400);
    assert.equal(generated, null);
  }
});

test('edition-only chat cannot fall back to a whole-book summary', async () => {
  const result = await invoke('chat', { editionId: 'edition', question: 'Summarize this' });
  assert.equal(result.error.statusCode, 400);
  assert.equal(generated, null);
});

test('selected text requires a passage and selected sections require an edition', async () => {
  for (const body of [{ selectedText: 'test' }, { sectionId: 'section' }]) {
    const result = await invoke('chat', { ...body, question: 'Summarize' });
    assert.equal(result.error.statusCode, 400);
    assert.equal(generated, null);
  }
});

test('history from a different selection cannot expand the current context', async () => {
  replace(prisma.chatConversation, 'findUnique', async () => ({ id: 'conversation', userId: 'user', editionId: 'edition', messages: [
    { role: 'assistant', content: 'Unrelated whole-book overview', passageRef: 'other-selection' },
  ] }));
  const result = await invoke('chat', { editionId: 'edition', sectionId: 'section', conversationId: 'conversation', question: 'Summarize' });
  assert.equal(result.error, undefined);
  assert.deepEqual(generated.messages, [{ role: 'user', content: 'Summarize' }]);
});
