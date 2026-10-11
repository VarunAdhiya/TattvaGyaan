-- CreateTable users
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "preferred_lang" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable sessions
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "sid" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable religions
CREATE TABLE "public"."religions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "religions_pkey" PRIMARY KEY ("id")
);

-- CreateTable scriptures
CREATE TABLE "public"."scriptures" (
    "id" TEXT NOT NULL,
    "religion_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "original_lang" TEXT NOT NULL,
    "description" TEXT,
    "summary" TEXT,
    "themes" TEXT[],
    "estimated_read_time" INTEGER,
    "availability_status" TEXT NOT NULL DEFAULT 'metadata_only',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scriptures_pkey" PRIMARY KEY ("id")
);

-- CreateTable scripture_editions
CREATE TABLE "public"."scripture_editions" (
    "id" TEXT NOT NULL,
    "scripture_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "script" TEXT,
    "translator" TEXT,
    "editor" TEXT,
    "source" TEXT,
    "license" TEXT,
    "provenance" TEXT,
    "is_original" BOOLEAN NOT NULL DEFAULT false,
    "text_direction" TEXT NOT NULL DEFAULT 'ltr',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scripture_editions_pkey" PRIMARY KEY ("id")
);

-- CreateTable scripture_sections
CREATE TABLE "public"."scripture_sections" (
    "id" TEXT NOT NULL,
    "edition_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scripture_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable scripture_passages
CREATE TABLE "public"."scripture_passages" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scripture_passages_pkey" PRIMARY KEY ("id")
);

-- CreateTable reading_progress
CREATE TABLE "public"."reading_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "edition_id" TEXT NOT NULL,
    "section_id" TEXT,
    "passage_id" TEXT,
    "page_index" INTEGER NOT NULL DEFAULT 0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable reading_plans
CREATE TABLE "public"."reading_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "edition_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "target_days" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "minutes_per_day" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable reading_plan_items
CREATE TABLE "public"."reading_plan_items" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "day_number" INTEGER NOT NULL,
    "section_id" TEXT NOT NULL,
    "passage_ids" TEXT[],
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "reading_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable bookmarks
CREATE TABLE "public"."bookmarks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "passage_id" TEXT NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable highlights
CREATE TABLE "public"."highlights" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "passage_id" TEXT NOT NULL,
    "start_offset" INTEGER NOT NULL,
    "end_offset" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#FBBF24',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable notes
CREATE TABLE "public"."notes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "passage_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable chat_conversations
CREATE TABLE "public"."chat_conversations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "edition_id" TEXT,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable chat_messages
CREATE TABLE "public"."chat_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "passage_ref" TEXT,
    "language" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sid_key" ON "public"."sessions"("sid");

-- CreateIndex
CREATE UNIQUE INDEX "religions_name_key" ON "public"."religions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "religions_slug_key" ON "public"."religions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "scriptures_slug_key" ON "public"."scriptures"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "scripture_sections_edition_id_slug_key" ON "public"."scripture_sections"("edition_id", "slug");

-- CreateIndex
CREATE INDEX "scripture_passages_section_id_sort_order_idx" ON "public"."scripture_passages"("section_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "reading_progress_user_id_edition_id_key" ON "public"."reading_progress"("user_id", "edition_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_user_id_passage_id_key" ON "public"."bookmarks"("user_id", "passage_id");

-- AddForeignKey
ALTER TABLE "public"."scriptures" ADD CONSTRAINT "scriptures_religion_id_fkey" FOREIGN KEY ("religion_id") REFERENCES "public"."religions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scripture_editions" ADD CONSTRAINT "scripture_editions_scripture_id_fkey" FOREIGN KEY ("scripture_id") REFERENCES "public"."scriptures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scripture_sections" ADD CONSTRAINT "scripture_sections_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "public"."scripture_editions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scripture_sections" ADD CONSTRAINT "scripture_sections_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."scripture_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scripture_passages" ADD CONSTRAINT "scripture_passages_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."scripture_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reading_progress" ADD CONSTRAINT "reading_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reading_plans" ADD CONSTRAINT "reading_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reading_plan_items" ADD CONSTRAINT "reading_plan_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."reading_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookmarks" ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bookmarks" ADD CONSTRAINT "bookmarks_passage_id_fkey" FOREIGN KEY ("passage_id") REFERENCES "public"."scripture_passages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."highlights" ADD CONSTRAINT "highlights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."highlights" ADD CONSTRAINT "highlights_passage_id_fkey" FOREIGN KEY ("passage_id") REFERENCES "public"."scripture_passages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notes" ADD CONSTRAINT "notes_passage_id_fkey" FOREIGN KEY ("passage_id") REFERENCES "public"."scripture_passages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_conversations" ADD CONSTRAINT "chat_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
