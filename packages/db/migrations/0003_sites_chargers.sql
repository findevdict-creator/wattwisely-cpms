CREATE TYPE "public"."charger_auth_mode" AS ENUM('password', 'none');--> statement-breakpoint
CREATE TYPE "public"."charger_registration_status" AS ENUM('accepted', 'pending', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."connector_status" AS ENUM('available', 'preparing', 'charging', 'suspended_ev', 'suspended_evse', 'finishing', 'reserved', 'occupied', 'unavailable', 'faulted', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."connector_type" AS ENUM('ccs1', 'ccs2', 'type1', 'type2', 'chademo', 'gbt', 'nacs', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."current_type" AS ENUM('ac', 'dc');--> statement-breakpoint
CREATE TYPE "public"."ocpp_version" AS ENUM('1.6', '2.0.1');--> statement-breakpoint
CREATE TYPE "public"."site_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" jsonb NOT NULL,
	"latitude" numeric(9, 6) NOT NULL,
	"longitude" numeric(9, 6) NOT NULL,
	"time_zone" text NOT NULL,
	"opening_hours" jsonb,
	"visibility" "site_visibility" DEFAULT 'private' NOT NULL,
	"power_limit_kw" numeric(8, 1),
	"parking_notes" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sites_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "sites_latitude_range" CHECK ("sites"."latitude" between -90 and 90),
	CONSTRAINT "sites_longitude_range" CHECK ("sites"."longitude" between -180 and 180)
);
--> statement-breakpoint
ALTER TABLE "sites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "chargers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"ocpp_identity" text NOT NULL,
	"vendor" text,
	"model" text,
	"auth_mode" charger_auth_mode NOT NULL,
	"password_hash" text,
	"allow_plain_ws" boolean DEFAULT false NOT NULL,
	"visibility_override" "site_visibility",
	"ocpp_version" "ocpp_version",
	"charge_point_serial" text,
	"charge_box_serial" text,
	"firmware_version" text,
	"iccid" text,
	"imsi" text,
	"meter_type" text,
	"meter_serial" text,
	"boot_fingerprint" jsonb,
	"registration_status" charger_registration_status,
	"heartbeat_interval_s" integer,
	"last_boot_at" timestamp with time zone,
	"last_heartbeat_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chargers_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "chargers_password_matches_mode" CHECK (("chargers"."auth_mode" = 'password') = ("chargers"."password_hash" is not null))
);
--> statement-breakpoint
ALTER TABLE "chargers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "connectors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"charger_id" uuid NOT NULL,
	"ocpp_connector_id" integer NOT NULL,
	"evse_id" integer,
	"type" "connector_type" DEFAULT 'unknown' NOT NULL,
	"current_type" "current_type",
	"max_power_kw" numeric(7, 1),
	"label" text NOT NULL,
	"status" "connector_status" DEFAULT 'unknown' NOT NULL,
	"error_code" text,
	"vendor_error_code" text,
	"status_info" text,
	"status_changed_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connectors_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "connectors_ocpp_id_unique" UNIQUE("charger_id","ocpp_connector_id"),
	CONSTRAINT "connectors_label_unique" UNIQUE("charger_id","label"),
	CONSTRAINT "connectors_ocpp_id_positive" CHECK ("connectors"."ocpp_connector_id" >= 1)
);
--> statement-breakpoint
ALTER TABLE "connectors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_created_by_user_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_updated_by_user_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chargers" ADD CONSTRAINT "chargers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chargers" ADD CONSTRAINT "chargers_created_by_user_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chargers" ADD CONSTRAINT "chargers_updated_by_user_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chargers" ADD CONSTRAINT "chargers_site_fk" FOREIGN KEY ("tenant_id","site_id") REFERENCES "public"."sites"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_created_by_user_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_updated_by_user_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_charger_fk" FOREIGN KEY ("tenant_id","charger_id") REFERENCES "public"."chargers"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sites_name_unique" ON "sites" USING btree ("tenant_id",lower("name")) WHERE "sites"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "sites_location_idx" ON "sites" USING btree ("tenant_id","latitude","longitude");--> statement-breakpoint
CREATE UNIQUE INDEX "chargers_identity_unique" ON "chargers" USING btree (lower("ocpp_identity")) WHERE "chargers"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "chargers_site_idx" ON "chargers" USING btree ("tenant_id","site_id");--> statement-breakpoint
CREATE INDEX "connectors_charger_idx" ON "connectors" USING btree ("tenant_id","charger_id");--> statement-breakpoint
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_site_fk" FOREIGN KEY ("tenant_id","site_id") REFERENCES "public"."sites"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "sites_tenant_isolation" ON "sites" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("sites"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("sites"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "chargers_tenant_isolation" ON "chargers" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("chargers"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("chargers"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "chargers_identity_lookup" ON "chargers" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING (lower("chargers"."ocpp_identity") = lower(nullif(current_setting('app.charger_identity', true), '')));--> statement-breakpoint
CREATE POLICY "connectors_tenant_isolation" ON "connectors" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("connectors"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("connectors"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);