CREATE TABLE "site_daily_stats" (
	"site_id" uuid NOT NULL,
	"day" date NOT NULL,
	"visits" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "site_daily_stats_site_id_day_pk" PRIMARY KEY("site_id","day")
);
--> statement-breakpoint
ALTER TABLE "ai_settings" ADD COLUMN "widget_style" text;--> statement-breakpoint
ALTER TABLE "site_daily_stats" ADD CONSTRAINT "site_daily_stats_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;