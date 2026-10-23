ALTER TABLE "reviews" ADD COLUMN "verified_phone" varchar(20);--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "verified_purchase" boolean DEFAULT false NOT NULL;