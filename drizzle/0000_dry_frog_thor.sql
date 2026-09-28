CREATE TABLE "question_progress" (
	"question_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'unlearned' NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"next_review_at" timestamp with time zone,
	"suppressed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_progress_status_check" CHECK ("question_progress"."status" in ('unlearned', 'uncertain', 'mastered'))
);
--> statement-breakpoint
CREATE TABLE "section_progress" (
	"section_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'unlearned' NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"next_review_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "section_progress_status_check" CHECK ("section_progress"."status" in ('unlearned', 'uncertain', 'mastered'))
);
--> statement-breakpoint
CREATE INDEX "question_progress_next_review_idx" ON "question_progress" USING btree ("next_review_at");--> statement-breakpoint
CREATE INDEX "section_progress_next_review_idx" ON "section_progress" USING btree ("next_review_at");