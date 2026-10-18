CREATE TABLE "devotional_texts" (
  "id" TEXT NOT NULL,
  "source_id" TEXT NOT NULL,
  "category" TEXT NOT NULL CHECK ("category" IN ('chalisa', 'bhajan', 'mantra')),
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "title_hindi" TEXT NOT NULL,
  "deity" TEXT NOT NULL,
  "hindi" TEXT,
  "transliteration" TEXT,
  "content_status" TEXT NOT NULL CHECK ("content_status" IN ('source_text', 'source_link')),
  "source_url" TEXT NOT NULL,
  "attribution" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "fetched_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "devotional_texts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "devotional_texts_content_check" CHECK (
    ("content_status" = 'source_link' AND "hindi" IS NULL AND "transliteration" IS NULL) OR
    ("content_status" = 'source_text' AND "hindi" IS NOT NULL AND "transliteration" IS NOT NULL AND length("hindi") > 0 AND length("transliteration") > 0)
  )
);
CREATE UNIQUE INDEX "devotional_texts_source_id_key" ON "devotional_texts"("source_id");
CREATE UNIQUE INDEX "devotional_texts_category_slug_key" ON "devotional_texts"("category", "slug");
CREATE INDEX "devotional_texts_category_deity_title_idx" ON "devotional_texts"("category", "deity", "title");

CREATE TABLE "calendar_days" (
  "date" DATE NOT NULL,
  "data" JSONB NOT NULL,
  "source_url" TEXT NOT NULL,
  "fetched_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "calendar_days_pkey" PRIMARY KEY ("date")
);

-- These tables are served by Express using its server-side database connection.
-- RLS prevents unintended writes through Supabase's separate Data API.
ALTER TABLE "devotional_texts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calendar_days" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "devotional_texts_read" ON "devotional_texts" FOR SELECT USING (true);
CREATE POLICY "calendar_days_read" ON "calendar_days" FOR SELECT USING (true);
