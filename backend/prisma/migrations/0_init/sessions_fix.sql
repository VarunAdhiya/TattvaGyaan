-- CreateTable sessions (connect-pg-simple compatible schema)
CREATE TABLE "public"."sessions" (
    "sid" VARCHAR NOT NULL PRIMARY KEY,
    "sess" JSONB NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL
);

CREATE INDEX "IDX_sessions_expire" on "public"."sessions" ("expire");
