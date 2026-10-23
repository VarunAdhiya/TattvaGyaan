CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "passage_search_chunks" (
  "id" TEXT PRIMARY KEY,
  "passage_id" TEXT NOT NULL REFERENCES "scripture_passages"("id") ON DELETE CASCADE,
  "source_hash" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "start_offset" INTEGER NOT NULL,
  "end_offset" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "embedding" vector(384) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ("start_offset" >= 0 AND "end_offset" > "start_offset")
);
CREATE INDEX "passage_search_chunks_passage_id_model_idx" ON "passage_search_chunks"("passage_id", "model");
CREATE INDEX "passage_search_chunks_keywords_idx" ON "passage_search_chunks" USING GIN (to_tsvector('simple', "text"));
-- Exact vector search is intentional for the small initial library: edition
-- filters must not lose matches through an approximate index's post-filtering.

CREATE TABLE "library_answers" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "question" TEXT NOT NULL,
  "response_lang" TEXT NOT NULL,
  "edition_id" TEXT,
  "result" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "library_answers_user_id_created_at_idx" ON "library_answers"("user_id", "created_at");
