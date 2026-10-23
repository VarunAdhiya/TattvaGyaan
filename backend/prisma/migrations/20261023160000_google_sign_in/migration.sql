-- Google-only accounts have no password. Existing passwords and user IDs remain intact.
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "google_sub" TEXT;
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");
-- App accounts are private and accessed only through the Express backend.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
