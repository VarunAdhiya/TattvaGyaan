ALTER TABLE "reading_plans" ADD COLUMN "analysis" JSONB;
ALTER TABLE "reading_plan_items" ADD COLUMN "estimated_minutes" INTEGER;
ALTER TABLE "reading_plan_items" ADD COLUMN "rationale" TEXT;
