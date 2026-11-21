CREATE TYPE "public"."question_notify" AS ENUM('instant', 'daily', 'off');--> statement-breakpoint
ALTER TABLE "unanswered_questions" ADD COLUMN "owner_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "question_notify" "question_notify" DEFAULT 'instant' NOT NULL;--> statement-breakpoint
-- Existing questions predate owner emails: mark them handled so the first digest does not send a backlog.
UPDATE "unanswered_questions" SET "owner_notified_at" = "first_asked_at" WHERE "owner_notified_at" IS NULL;
