# Library questions and AI providers

The signed-in `/ask` page retrieves evidence from the six published reader
editions and returns explanations with links to exact passages. The reader's
existing selection-based assistant remains scoped to its selected text.

## Provider configuration

Add these settings to `backend/.env` and restart the API:

```dotenv
AI_PROVIDER=groq
GROQ_API_KEY=your-key-here
GROQ_MODEL=openai/gpt-oss-120b
GROQ_TIMEOUT_MS=90000
```

To switch back, set `AI_PROVIDER=gemini`; retain your existing `GEMINI_API_KEY`,
`GEMINI_MODEL`, and `GEMINI_TIMEOUT_MS`. With no provider setting, Gemini remains
the backward-compatible default. There is no silent fallback between providers.
All existing AI features use the selected provider. Never put API keys in Vite
variables or frontend files. Groq JSON mode is validated with Zod; model-specific
request failures remain visible rather than being replaced with canned answers.

## Database and indexing

From `backend/`:

```powershell
npm install
npx prisma migrate deploy
npm run prisma:generate
npm run rag:index
```

The database must allow the `vector` extension. The migration adds derived
`passage_search_chunks`, private `library_answers`, and RLS. The existing
privileged Express database connection performs access; no public Data API
policies are created. Answer history and deletion are scoped to the session user.
Stop the API before regenerating Prisma on Windows if its DLL is locked.

Embeddings run locally in a worker thread using Transformers.js and the pinned,
quantized `Xenova/multilingual-e5-small` model (384 dimensions). Initial use
downloads model files from Hugging Face to ignored `data/embedding-models/`.
Allow several hundred MB of disk/memory and outbound access for this first
download. Subsequent use reads the cache. No embedding API key is required.
The model uses `query:` and `passage:` prefixes with normalized mean pooling.
The `sharp` override patches an unused image-processing transitive dependency.

Indexing is incremental and resumable. It copies exact overlapping source
substrings with offsets, passage IDs, text hashes and model identity. Re-run
after imports or source edits. Use `npm run rag:index -- --edition=<id>`
when indexing a single published edition. Source text, reader IDs and annotations
are never rewritten. Changed, retired, or differently embedded sources are
excluded at retrieval time. Coverage is visible in the UI during indexing.

## Retrieval and answer validation

Search combines exact pgvector cosine ranking and PostgreSQL `simple` full-text
ranking using reciprocal rank fusion. A similarity prefilter is not a confidence
percentage. At most six different passages reach the generation model. Exact
vector scans preserve filtering recall for this small collection; larger corpora
should benchmark approximate indexes and filtered recall before switching.

The model must cite retrieved source IDs for each explanatory paragraph or
abstain. Zod rejects malformed/uncited answers and unknown IDs. Excerpts and links
are built from database records, not model output. Sources are rechecked before
saving and history links are disabled when source versions change. Structural
citation checks do not prove entailment: review answer quality and interpretation
separately. Draft/OCR sources remain labeled, including comparative studies.

Questions are independent (not a conversational follow-up thread). The last ten
answers are displayed and users can clear their full saved history. Existing
reader chat history remains separate. A per-user, in-process limiter allows one
active question and 20 requests per 15 minutes; use a shared limiter before
running multiple API replicas.

## Validation

```powershell
npm test
npm run rag:eval
node scripts/evaluate-rag.cjs --answers
```

`rag:eval` is read-only and uses real Hindi/English questions against the Gita
edition. `--answers` additionally calls the configured paid generation provider
to check citations and out-of-library abstention; it does not save user history.
The initial benchmark is intentionally small, not a claim of universal Hindi,
Romanized Hindi, OCR, or theological accuracy. Extend it with reviewed examples.

Frontend checks: `npm run build`, `npm run lint`, and
`npx playwright test tests/library-ai.spec.js tests/reader.spec.js tests/theme.spec.js`.
Browser fixtures are synthetic; live retrieval checks use original stored text.
