CREATE TYPE "public"."session_line_kind" AS ENUM('start_fee', 'energy', 'time', 'idle', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."tariff_status" AS ENUM('active', 'archived');--> statement-breakpoint
-- Module 4 recorded two states (charging, ended); module 5 has the full set. Ended
-- sessions were never priced, so they become completed with no amounts.
ALTER TABLE "charging_sessions" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "charging_sessions" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."charging_session_status";--> statement-breakpoint
CREATE TYPE "public"."charging_session_status" AS ENUM('authorising', 'starting', 'charging', 'suspended', 'idle', 'stopping', 'completed', 'not_started', 'failed');--> statement-breakpoint
UPDATE "charging_sessions" SET "status" = 'completed' WHERE "status" = 'ended';--> statement-breakpoint
ALTER TABLE "charging_sessions" ALTER COLUMN "status" SET DATA TYPE charging_session_status USING "status"::charging_session_status;--> statement-breakpoint
ALTER TABLE "charging_sessions" ALTER COLUMN "status" SET DEFAULT 'charging'::charging_session_status;--> statement-breakpoint
CREATE TABLE "tariffs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"currency" text NOT NULL,
	"status" "tariff_status" DEFAULT 'active' NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"archived_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tariffs_tenant_id_unique" UNIQUE("tenant_id","id")
);--> statement-breakpoint
ALTER TABLE "tariffs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tariff_versions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tariff_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"tax_rate" integer NOT NULL,
	"is_tax_included" boolean DEFAULT true NOT NULL,
	"start_fee" bigint DEFAULT 0 NOT NULL,
	"idle_grace_minutes" integer DEFAULT 0 NOT NULL,
	"idle_fee_cap" bigint,
	"minimum_price" bigint,
	"maximum_price" bigint,
	"is_free_without_energy" boolean DEFAULT true NOT NULL,
	"bands" jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tariff_versions_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "tariff_versions_number_unique" UNIQUE("tariff_id","number"),
	CONSTRAINT "tariff_versions_tax_rate_range" CHECK ("tariff_versions"."tax_rate" between 0 and 10000),
	CONSTRAINT "tariff_versions_amounts_positive" CHECK ("tariff_versions"."start_fee" >= 0 and "tariff_versions"."idle_grace_minutes" >= 0 and coalesce("tariff_versions"."idle_fee_cap", 0) >= 0 and coalesce("tariff_versions"."minimum_price", 0) >= 0 and coalesce("tariff_versions"."maximum_price", 0) >= 0)
);--> statement-breakpoint
ALTER TABLE "tariff_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session_state_changes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"from_status" charging_session_status,
	"to_status" charging_session_status NOT NULL,
	"event" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "session_state_changes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session_line_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"kind" "session_line_kind" NOT NULL,
	"band_name" text,
	"from_at" timestamp with time zone,
	"to_at" timestamp with time zone,
	"quantity" numeric(14, 3) NOT NULL,
	"unit" text NOT NULL,
	"unit_price" integer,
	"net" bigint NOT NULL,
	"tax" bigint NOT NULL,
	"gross" bigint NOT NULL,
	CONSTRAINT "session_line_items_position_unique" UNIQUE("session_id","position")
);--> statement-breakpoint
ALTER TABLE "session_line_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "tariff_id" uuid;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "unplugged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "energy_increased_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "last_event_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "failure_reason" text;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "tariff_version_id" uuid;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "currency" text;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "net_amount" bigint;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "tax_amount" bigint;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "gross_amount" bigint;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "priced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "pricing_engine_version" text;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "pricing_input_hash" text;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "review_flags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
-- The site and its time zone are copied onto each session; fill them in for existing sessions.
ALTER TABLE "charging_sessions" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "time_zone" text;--> statement-breakpoint
UPDATE "charging_sessions" AS s SET "site_id" = c."site_id", "time_zone" = st."time_zone" FROM "chargers" AS c JOIN "sites" AS st ON st."id" = c."site_id" WHERE c."id" = s."charger_id";--> statement-breakpoint
ALTER TABLE "charging_sessions" ALTER COLUMN "site_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "charging_sessions" ALTER COLUMN "time_zone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD CONSTRAINT "charging_sessions_tenant_id_unique" UNIQUE("tenant_id","id");--> statement-breakpoint
ALTER TABLE "tariffs" ADD CONSTRAINT "tariffs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariffs" ADD CONSTRAINT "tariffs_created_by_user_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariffs" ADD CONSTRAINT "tariffs_updated_by_user_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariff_versions" ADD CONSTRAINT "tariff_versions_created_by_user_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariff_versions" ADD CONSTRAINT "tariff_versions_tariff_fk" FOREIGN KEY ("tenant_id","tariff_id") REFERENCES "public"."tariffs"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_state_changes" ADD CONSTRAINT "session_state_changes_session_fk" FOREIGN KEY ("tenant_id","session_id") REFERENCES "public"."charging_sessions"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_line_items" ADD CONSTRAINT "session_line_items_session_fk" FOREIGN KEY ("tenant_id","session_id") REFERENCES "public"."charging_sessions"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tariffs_name_unique" ON "tariffs" USING btree ("tenant_id",lower("name")) WHERE "tariffs"."status" = 'active';--> statement-breakpoint
CREATE INDEX "session_state_changes_session_idx" ON "session_state_changes" USING btree ("session_id","occurred_at");--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_tariff_fk" FOREIGN KEY ("tenant_id","tariff_id") REFERENCES "public"."tariffs"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD CONSTRAINT "charging_sessions_site_fk" FOREIGN KEY ("tenant_id","site_id") REFERENCES "public"."sites"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD CONSTRAINT "charging_sessions_tariff_version_fk" FOREIGN KEY ("tenant_id","tariff_version_id") REFERENCES "public"."tariff_versions"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "charging_sessions_site_idx" ON "charging_sessions" USING btree ("tenant_id","site_id","started_at");--> statement-breakpoint
CREATE INDEX "charging_sessions_open_idx" ON "charging_sessions" USING btree ("tenant_id","status","last_event_at") WHERE "charging_sessions"."closed_at" is null;--> statement-breakpoint
CREATE POLICY "tariffs_tenant_isolation" ON "tariffs" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("tariffs"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("tariffs"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tariff_versions_tenant_isolation" ON "tariff_versions" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("tariff_versions"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("tariff_versions"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "session_state_changes_tenant_isolation" ON "session_state_changes" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("session_state_changes"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("session_state_changes"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "session_line_items_tenant_isolation" ON "session_line_items" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("session_line_items"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("session_line_items"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
-- Give sessions recorded before this module a timeline: started, and for finished ones, ended.
UPDATE "charging_sessions" SET "closed_at" = "ended_at" WHERE "status" = 'completed';--> statement-breakpoint
INSERT INTO "session_state_changes" ("id", "tenant_id", "session_id", "from_status", "to_status", "event", "occurred_at") SELECT gen_random_uuid(), "tenant_id", "id", NULL, 'charging', 'transaction_started', "started_at" FROM "charging_sessions";--> statement-breakpoint
INSERT INTO "session_state_changes" ("id", "tenant_id", "session_id", "from_status", "to_status", "event", "occurred_at", "details") SELECT gen_random_uuid(), "tenant_id", "id", 'charging', 'completed', 'transaction_ended', "ended_at", '{"note": "recorded before sessions were priced"}'::jsonb FROM "charging_sessions" WHERE "status" = 'completed';
