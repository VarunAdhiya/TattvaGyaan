const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { config } = require('../dist/config');
const { aiService } = require('../dist/services/aiService');
const original = { provider: config.aiProvider, groq: { ...config.groq }, fetch: global.fetch };
let request;
const chat = () => aiService.chat({ messages: [{ role: 'user', content: 'Explain duty' }], responseLang: 'hi' });
function response(body, status = 200) {
  global.fetch = async (url, options) => { request = { url, options, body: JSON.parse(options.body) }; return new Response(JSON.stringify(body), { status }); };
}
beforeEach(() => {
  config.aiProvider = 'groq'; Object.assign(config.groq, { apiKey: 'private-test-key', model: 'test-model', timeoutMs: 90000 });
  request = null; response({ model: 'served-model', choices: [{ finish_reason: 'stop', message: { content: 'Explanation' } }], usage: { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15 } });
});
afterEach(() => { config.aiProvider = original.provider; Object.assign(config.groq, original.groq); global.fetch = original.fetch; });

test('Groq preserves frontend contract and message history without Gemini-specific settings', async () => {
  const result = await aiService.chat({ messages: [{ role: 'user', content: 'First' }, { role: 'assistant', content: 'Earlier' }, { role: 'user', content: 'Next' }], responseLang: 'hi' });
  assert.deepEqual(result, { content: 'Explanation', model: 'served-model', usage: { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15 } });
  assert.equal(request.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(request.options.headers.Authorization, 'Bearer private-test-key');
  assert.deepEqual(request.body.messages.map(m => m.role), ['system', 'user', 'assistant', 'user']);
  assert.match(request.body.messages[0].content, /Respond in hi/);
  assert.equal(request.body.generationConfig, undefined);
});
test('Groq reading analysis requests JSON and validates semantic completeness', async () => {
  const params = { title: 'Book', language: 'hi', targetDays: 1, groups: [{ id: 0, titles: ['Chapter'], wordCount: 10, passageCount: 1, samples: ['Text'] }] };
  response({ choices: [{ message: { content: JSON.stringify({ wordsPerMinute: 100, reflectionPercent: 20, summary: 'Sample-based estimate', groups: [] }) }, finish_reason: 'stop' }] });
  await assert.rejects(aiService.analyzeReadingPace(params), e => e.statusCode === 502);
  assert.deepEqual(request.body.response_format, { type: 'json_object' });
});
test('Groq missing key fails without sending a request or falling back to Gemini', async () => {
  config.groq.apiKey = '';
  await assert.rejects(chat(), e => e.statusCode === 503 && /GROQ_API_KEY/.test(e.message));
  assert.equal(request, null);
});
test('Groq errors never disclose provider bodies or credentials', async () => {
  for (const status of [400, 401, 403, 404, 429, 500]) {
    response({ error: { message: 'private-test-key source text' } }, status);
    await assert.rejects(chat(), e => {
      assert.equal(e.statusCode, status === 429 ? 429 : 503);
      assert.doesNotMatch(e.message, /private-test-key|source text/); return true;
    });
  }
});
test('Groq rejects truncation, refusal and empty output', async () => {
  for (const [choice, code] of [[{ finish_reason: 'length', message: { content: 'Partial' } }, 502], [{ finish_reason: 'content_filter' }, 422], [{ message: { refusal: 'No' } }, 422], [{ message: { content: '' } }, 502]]) {
    response({ choices: [choice] });
    await assert.rejects(chat(), e => e.statusCode === code);
  }
});
test('Groq timeout and network errors are actionable', async () => {
  global.fetch = async () => { throw new DOMException('timeout', 'TimeoutError'); };
  await assert.rejects(chat(), e => e.statusCode === 504 && /GROQ_TIMEOUT_MS/.test(e.message));
  global.fetch = async () => { throw new Error('private-test-key'); };
  await assert.rejects(chat(), e => e.statusCode === 503 && !e.message.includes('private-test-key'));
});
