ALTER TABLE "scripture_editions" ADD COLUMN "content_status" TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE "scripture_editions" ADD COLUMN "expected_passages" INTEGER;
ALTER TABLE "scripture_passages" ADD COLUMN "source_notes" TEXT;
UPDATE "scriptures" SET "availability_status" = CASE WHEN EXISTS (
  SELECT 1 FROM "scripture_editions" e JOIN "scripture_sections" s ON s.edition_id = e.id
  JOIN "scripture_passages" p ON p.section_id = s.id WHERE e.scripture_id = "scriptures".id
) THEN 'partial' ELSE 'metadata_only' END;
