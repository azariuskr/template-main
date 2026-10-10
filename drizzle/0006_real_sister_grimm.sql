CREATE TYPE "public"."cms_profile_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."cms_section_type" AS ENUM('hero', 'banner', 'feature_grid', 'rich_text', 'faq', 'custom');--> statement-breakpoint
CREATE TYPE "public"."cms_version_status" AS ENUM('draft', 'published', 'rolled_back');--> statement-breakpoint
CREATE TABLE "cms_asset_binding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_translation_id" uuid NOT NULL,
	"slot" text NOT NULL,
	"file_id" uuid,
	"asset_url" text,
	"alt_text" text,
	"metadata" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_locale" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"language" text NOT NULL,
	"region" text,
	"display_name" text NOT NULL,
	"fallback_code" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_locale_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "cms_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"status" "cms_profile_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cms_profile_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cms_section" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"key" text NOT NULL,
	"type" "cms_section_type" DEFAULT 'custom' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_section_translation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"locale_code" text NOT NULL,
	"title" text,
	"subtitle" text,
	"content" jsonb NOT NULL,
	"seo" jsonb,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" "cms_version_status" DEFAULT 'draft' NOT NULL,
	"snapshot" jsonb NOT NULL,
	"notes" text,
	"published_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cms_asset_binding" ADD CONSTRAINT "cms_asset_binding_section_translation_id_cms_section_translation_id_fk" FOREIGN KEY ("section_translation_id") REFERENCES "public"."cms_section_translation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_section" ADD CONSTRAINT "cms_section_profile_id_cms_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."cms_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_section_translation" ADD CONSTRAINT "cms_section_translation_section_id_cms_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."cms_section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_version" ADD CONSTRAINT "cms_version_profile_id_cms_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."cms_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_version" ADD CONSTRAINT "cms_version_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cms_asset_binding_translation_id_idx" ON "cms_asset_binding" USING btree ("section_translation_id");--> statement-breakpoint
CREATE INDEX "cms_asset_binding_slot_idx" ON "cms_asset_binding" USING btree ("slot");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_asset_binding_translation_slot_unique_idx" ON "cms_asset_binding" USING btree ("section_translation_id","slot");--> statement-breakpoint
CREATE INDEX "cms_locale_code_idx" ON "cms_locale" USING btree ("code");--> statement-breakpoint
CREATE INDEX "cms_locale_language_idx" ON "cms_locale" USING btree ("language");--> statement-breakpoint
CREATE INDEX "cms_locale_is_default_idx" ON "cms_locale" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "cms_locale_is_active_idx" ON "cms_locale" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "cms_profile_slug_idx" ON "cms_profile" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "cms_profile_status_idx" ON "cms_profile" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cms_profile_is_default_idx" ON "cms_profile" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "cms_section_profile_id_idx" ON "cms_section" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "cms_section_key_idx" ON "cms_section" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_section_profile_key_unique_idx" ON "cms_section" USING btree ("profile_id","key");--> statement-breakpoint
CREATE INDEX "cms_section_translation_section_id_idx" ON "cms_section_translation" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "cms_section_translation_locale_code_idx" ON "cms_section_translation" USING btree ("locale_code");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_section_translation_section_locale_unique_idx" ON "cms_section_translation" USING btree ("section_id","locale_code");--> statement-breakpoint
CREATE INDEX "cms_version_profile_id_idx" ON "cms_version" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "cms_version_status_idx" ON "cms_version" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "cms_version_profile_version_unique_idx" ON "cms_version" USING btree ("profile_id","version");