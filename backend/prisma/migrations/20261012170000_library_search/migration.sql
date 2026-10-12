ALTER TABLE "scriptures" ADD COLUMN "search_text" TEXT NOT NULL DEFAULT '';
UPDATE "scriptures" SET "search_text" = "title" || ' ' || "slug" || ' ' || COALESCE("description", '') || ' ' || array_to_string("themes", ' ');
CREATE INDEX "scriptures_religion_id_idx" ON "scriptures"("religion_id");
CREATE INDEX "scripture_editions_scripture_id_language_idx" ON "scripture_editions"("scripture_id", "language");
CREATE INDEX "scripture_sections_edition_id_sort_order_id_idx" ON "scripture_sections"("edition_id", "sort_order", "id");
CREATE INDEX "scripture_passages_section_id_sort_order_id_idx" ON "scripture_passages"("section_id", "sort_order", "id");
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "scriptures_search_text_trgm_idx" ON "scriptures" USING GIN ("search_text" gin_trgm_ops);
