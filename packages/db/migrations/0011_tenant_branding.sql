-- Module 8, tenant branding: how a tenant presents itself to drivers (name, colours, logo,
-- support contact), one row per tenant, created on the first save. The logo's bytes live
-- in the row (at most 512 KB); the API serves them and object storage can take over later.
CREATE TABLE "tenant_branding" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"display_name" text,
	"primary_color" text,
	"accent_color" text,
	"support_email" text,
	"support_phone" text,
	"support_url" text,
	"logo_content_type" text,
	"logo_data" "bytea",
	"logo_etag" text,
	"logo_size_bytes" integer,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_branding_tenant_unique" UNIQUE("tenant_id"),
	CONSTRAINT "tenant_branding_logo_complete" CHECK (("tenant_branding"."logo_data" IS NULL) = ("tenant_branding"."logo_content_type" IS NULL) AND ("tenant_branding"."logo_data" IS NULL) = ("tenant_branding"."logo_etag" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "tenant_branding" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_branding" ADD CONSTRAINT "tenant_branding_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_branding" ADD CONSTRAINT "tenant_branding_updated_by_user_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "tenant_branding_tenant_isolation" ON "tenant_branding" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("tenant_branding"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("tenant_branding"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);