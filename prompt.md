Implement citation-backed semantic RAG for the TattvaGyaan repository.

Project context:
- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL/Supabase.
- Frontend: React/Vite.
- Existing AI files include `backend/src/services/aiService.ts`, `backend/src/services/ragService.ts`, `backend/src/controllers/aiController.ts`, `backend/src/routes/ai.ts`, and `frontend/src/components/AIAssistantDrawer.jsx`.
- The project already uses the OpenAI SDK and environment variables `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_EMBEDDING_MODEL`.
- Existing `ragService` is keyword matching with `contains`; replace/extend it with semantic retrieval.
- Do not expose any API key to the frontend.
- Do not change original scripture text. AI content must be clearly presented as explanatory material.

Goal:
Build an AI “Ask this Scripture” experience that retrieves relevant passages from the selected scripture edition, answers only from those sources, and returns clickable citations.

Requirements:

1. Add pgvector support in Supabase/Postgres.
   - Create a safe SQL migration that enables the `vector` extension.
   - Create a `passage_embeddings` table linked one-to-one with `scripture_passages`.
   - Store: passage ID, embedding vector, embedding model, content hash, created timestamp, updated timestamp.
   - Add an efficient vector similarity index appropriate for the chosen pgvector setup.
   - Keep the vector column handled through raw SQL/Prisma raw queries if Prisma does not natively support the vector type.

2. Add an embedding service.
   - Use `OPENAI_EMBEDDING_MODEL`, defaulting to `text-embedding-3-small`.
   - Generate embeddings for scripture passage text only.
   - Include edition, scripture title, section title, verse reference, and passage text in the embedding input where useful.
   - Add a resumable, batched backfill script, for example `npm run embeddings:backfill`.
   - Do not regenerate embeddings when the stored content hash has not changed.
   - Log progress safely without printing API keys or full sensitive configuration.

3. Upgrade retrieval.
   - For a user question, generate an embedding.
   - Search the closest passages using pgvector similarity.
   - Filter to the selected `editionId` by default.
   - Retrieve a small number of strong matches, such as top 5.
   - Return passage ID, scripture title, edition title, section title, verse reference, source text, and similarity score.
   - If no edition is selected, do not silently mix traditions; require an explicit cross-scripture mode in the request.

4. Upgrade the AI chat endpoint.
   - Use the retrieved passages as the only scripture evidence provided to the model.
   - Instruct the model never to invent verses or citations.
   - If sources are insufficient, it must say so.
   - Distinguish source text, paraphrase, and interpretation.
   - Acknowledge that interpretations can differ between traditions and schools.
   - Return structured JSON:
     - `answer`
     - `conversationId`
     - `sources[]` with `passageId`, `reference`, `sectionTitle`, `editionTitle`, `scriptureTitle`, and `similarity`
     - `model`
     - `usage` when available
   - Preserve existing authentication and AI rate limiting.

5. Fix conversation persistence.
   - In `AIAssistantDrawer`, save the returned `conversationId` in state.
   - Send that ID with follow-up questions so one chat remains one server-side conversation.
   - Add a “New chat” action that clears the local conversation ID and messages.

6. Upgrade the frontend.
   - Show a “Sources used” area below every AI answer.
   - Each source must be clickable and navigate/open the relevant passage in the reader.
   - Keep the disclaimer that AI output is explanatory material and original scripture remains unchanged.
   - Show useful states for loading, no sources found, and API/configuration errors.

7. Add cost and safety controls.
   - Enforce input and output limits.
   - Keep the existing AI rate limit and make it configurable through environment variables.
   - Do not send an entire book or all chat history to the model.
   - Use only the latest limited chat messages plus retrieved passages.
   - Add basic tests for retrieval filtering, citation shape, and conversation ownership.
   - Update `.env.example`, package scripts, and a README section with setup/migration/backfill instructions.
   - Replace any real-looking passwords in `.env.example` with placeholders.

Implementation quality:
- Inspect the current repository before editing.
- Keep backward compatibility with existing explain and summarize features.
- Use clear TypeScript types and Zod validation.
- Do not use LangChain or LangGraph; use the existing OpenAI SDK, Prisma, and raw SQL where necessary.
- First show a concise implementation plan, then make the changes, run relevant checks, and report changed files plus any manual Supabase steps I must perform.