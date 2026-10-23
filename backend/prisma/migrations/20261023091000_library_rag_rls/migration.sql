-- Only the Express backend's privileged database connection accesses these.
-- No public REST policies: user-scoped authorization remains in Express.
ALTER TABLE "passage_search_chunks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "library_answers" ENABLE ROW LEVEL SECURITY;
