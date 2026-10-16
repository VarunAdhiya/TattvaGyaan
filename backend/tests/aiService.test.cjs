const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { config } = require('../dist/config');
const { aiService } = require('../dist/services/aiService');
const { AppError } = require('../dist/middleware/errorHandler');

const originalFetch = global.fetch;
const originalConfig = { ...config.gemini };
let requests;

function mockResponse(body, status = 200) {
  global.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return new Response(JSON.stringify(body), { status });
  };
}

function chat() {
  return aiService.chat({ messages: [{ role: 'user', content: 'Explain duty.' }], responseLang: 'en' });
}

beforeEach(() => {
  requests = [];
  Object.assign(config.gemini, { apiKey: 'test-key', model: 'test-model', timeoutMs: 90000 });
  mockResponse({ candidates: [{ content: { parts: [{ text: 'An explanation.' }] }, finishReason: 'STOP' }] });
});

afterEach(() => {
  global.fetch = originalFetch;
  Object.assign(config.gemini, originalConfig);
});

test('chat preserves history, scripture context, and the frontend response contract', async () => {
  mockResponse({
    candidates: [{ content: { parts: [{ text: 'An ' }, { text: 'explanation.' }] }, finishReason: 'STOP' }],
    modelVersion: 'test-model-version',
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, thoughtsTokenCount: 2, totalTokenCount: 17 },
  });
  const result = await aiService.chat({
    messages: [
      { role: 'user', content: 'What is duty?' },
      { role: 'assistant', content: 'A responsibility.' },
      { role: 'user', content: 'Explain further.' },
    ],
    scriptureContext: {
      title: 'Bhagavad Gita', edition: 'Original', sourceLang: 'sa',
      section: 'Chapter 2', passageText: 'Provided scripture text', passageRef: '2.47',
    },
    responseLang: 'hi',
  });
  assert.deepEqual(result, {
    content: 'An explanation.', model: 'test-model-version',
    usage: { prompt_tokens: 10, completion_tokens: 7, total_tokens: 17 },
  });
  const request = requests[0];
  assert.equal(new URL(request.url).hostname, 'generativelanguage.googleapis.com');
  assert.equal(new URL(request.url).search, '');
  assert.equal(request.options.headers['x-goog-api-key'], 'test-key');
  assert.deepEqual(request.body.contents.map(message => message.role), ['user', 'model', 'user']);
  assert.equal(request.body.contents[1].parts[0].text, 'A responsibility.');
  assert.match(request.body.systemInstruction.parts[0].text, /Respond in hi/);
  assert.match(request.body.systemInstruction.parts[0].text, /Provided scripture text/);
});

test('explanations preserve original text, references, requested language and style', async () => {
  await aiService.explainPassage({
    text: 'कर्मण्येवाधिकारस्ते', reference: '2.47', scriptureTitle: 'Bhagavad Gita',
    sourceLang: 'sa', responseLang: 'hi', style: 'detailed', context: 'Surrounding verses', question: 'What does this mean?',
  });
  const body = requests[0].body;
  assert.match(body.contents[0].parts[0].text, /कर्मण्येवाधिकारस्ते/);
  assert.match(body.contents[0].parts[0].text, /2\.47/);
  assert.match(body.contents[0].parts[0].text, /Surrounding verses/);
  assert.match(body.contents[0].parts[0].text, /What does this mean\?/);
  assert.match(body.systemInstruction.parts[0].text, /Respond in hi/);
  assert.match(body.systemInstruction.parts[0].text, /detailed analysis/);
});

test('Gemini 3 text requests use low thinking without sending unsupported settings to other models', async () => {
  for (const model of ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-3.1-flash-lite-image']) {
    config.gemini.model = model;
    await aiService.explainPassage({
      text: 'Provided source text', reference: '2.47', scriptureTitle: 'Bhagavad Gita',
      sourceLang: 'en', responseLang: 'en', style: 'simple',
    });
    const generationConfig = requests.at(-1).body.generationConfig;
    assert.deepEqual(generationConfig.thinkingConfig,
      ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3-flash-preview'].includes(model) ? { thinkingLevel: 'low' } : undefined);
    assert.equal(generationConfig.maxOutputTokens, 2000);
  }
});

test('configuration defaults to Flash-Lite and a 90-second timeout while respecting valid overrides', () => {
  for (const [value, expected] of [['', 90000], ['45000', 45000], ['invalid', 90000], ['0', 90000], ['-1', 90000], ['4294967296', 90000]]) {
    const output = execFileSync(process.execPath, ['-e', "const {model, timeoutMs}=require('./dist/config').config.gemini; process.stdout.write(JSON.stringify({model, timeoutMs}))"], {
      cwd: require('node:path').resolve(__dirname, '..'),
      env: { ...process.env, GEMINI_TIMEOUT_MS: value, GEMINI_MODEL: '', gemini_model: '' },
      encoding: 'utf8',
    });
    assert.deepEqual(JSON.parse(output), { model: 'gemini-3.1-flash-lite', timeoutMs: expected });
  }
  const output = execFileSync(process.execPath, ['-e', "process.stdout.write(require('./dist/config').config.gemini.model)"], {
    cwd: require('node:path').resolve(__dirname, '..'),
    env: { ...process.env, GEMINI_MODEL: 'models/gemini-3.8-flash' },
    encoding: 'utf8',
  });
  assert.equal(output, 'gemini-3.8-flash');
});

test('the configured deadline aborts a slow request and gives actionable guidance', async () => {
  config.gemini.timeoutMs = 20;
  global.fetch = async (url, options) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(new Response('{}')), 1000);
    options.signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(options.signal.reason);
    }, { once: true });
  });
  await assert.rejects(chat(), error => {
    assert.equal(error.statusCode, 504);
    assert.match(error.message, /GEMINI_TIMEOUT_MS/);
    assert.doesNotMatch(error.message, /test-key/);
    return true;
  });
});

test('summaries send supplied passages and references without altering source text', async () => {
  await aiService.summarizeSection({
    passages: [{ reference: '2.47', text: 'First original passage' }, { reference: '2.48', text: 'Second original passage' }],
    scriptureTitle: 'Bhagavad Gita', sectionTitle: 'Chapter 2', sourceLang: 'sa', responseLang: 'en',
  });
  assert.match(requests[0].body.contents[0].parts[0].text, /2\.47: First original passage\n\n2\.48: Second original passage/);
  assert.match(requests[0].body.systemInstruction.parts[0].text, /summary, not original scripture/);
});

test('missing configuration fails before making an HTTP request', async () => {
  config.gemini.apiKey = '';
  await assert.rejects(chat(), error => error instanceof AppError && error.statusCode === 503 && /GEMINI_API_KEY/.test(error.message));
  assert.equal(requests.length, 0);
});

test('quota, authentication, model and provider failures are surfaced without canned replies or secrets', async t => {
  for (const [providerStatus, appStatus, message] of [
    [429, 429, /quota/], [401, 503, /authentication/], [403, 503, /authentication/],
    [404, 503, /GEMINI_MODEL/], [400, 503, /rejected/], [500, 503, /unavailable/],
  ]) {
    await t.test(String(providerStatus), async () => {
      mockResponse({ error: { status: 'PROVIDER_ERROR', message: 'Sensitive test-key request text' } }, providerStatus);
      await assert.rejects(chat(), error => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, appStatus);
        assert.match(error.message, message);
        assert.doesNotMatch(error.message, /test-key|Sensitive|offline mode/);
        return true;
      });
    });
  }
});

test('network failures and timeouts produce actionable errors', async t => {
  await t.test('connection failure', async () => {
    global.fetch = async () => { throw new TypeError('fetch failed'); };
    await assert.rejects(chat(), error => error.statusCode === 503 && /connect/.test(error.message));
  });
  await t.test('request timeout', async () => {
    global.fetch = async () => { throw new DOMException('Timed out', 'TimeoutError'); };
    await assert.rejects(chat(), error => error.statusCode === 504);
  });
  await t.test('timeout while reading the response', async () => {
    global.fetch = async () => ({ ok: true, json: async () => { throw new DOMException('Aborted', 'AbortError'); } });
    await assert.rejects(chat(), error => error.statusCode === 504);
  });
});

test('blocked requests and blocked candidates return errors even if partial text is present', async t => {
  for (const body of [
    { promptFeedback: { blockReason: 'SAFETY' } },
    { candidates: [{ finishReason: 'SAFETY', content: { parts: [{ text: 'Partial unsafe output' }] } }] },
    { candidates: [{ finishReason: 'RECITATION' }] },
  ]) {
    await t.test(JSON.stringify(body), async () => {
      mockResponse(body);
      await assert.rejects(chat(), error => error.statusCode === 422 && /rephrase/.test(error.message));
    });
  }
});

test('empty responses are errors, and thought parts are excluded from displayed content', async () => {
  mockResponse({ candidates: [] });
  await assert.rejects(chat(), error => error.statusCode === 502);
  mockResponse({ candidates: [{ content: { parts: [{ text: 'Thought summary', thought: true }, { text: 'Public answer' }] } }] });
  assert.equal((await chat()).content, 'Public answer');
});

test('reading analysis validates all requested groups before a plan can be saved', async () => {
  const params = { title: 'Test book', language: 'en', targetDays: 3, groups: [{ id: 0, titles: ['Section'], wordCount: 100, passageCount: 2, samples: ['Test sample'] }] };
  const analysis = { wordsPerMinute: 100, reflectionPercent: 25, summary: 'Estimated from samples', groups: [{ id: 0, difficulty: 2, reason: 'Dense sample' }] };
  mockResponse({ candidates: [{ content: { parts: [{ text: JSON.stringify(analysis) }] } }] });
  assert.equal((await aiService.analyzeReadingPace(params)).groups[0].difficulty, 2);
  assert.equal(requests[0].body.generationConfig.responseMimeType, 'application/json');
  for (const invalid of [{ ...analysis, groups: [] }, { ...analysis, groups: [{ ...analysis.groups[0], id: 99 }] }, { ...analysis, wordsPerMinute: 0 }]) {
    mockResponse({ candidates: [{ content: { parts: [{ text: JSON.stringify(invalid) }] } }] });
    await assert.rejects(aiService.analyzeReadingPace(params), error => error.statusCode === 502);
  }
});
