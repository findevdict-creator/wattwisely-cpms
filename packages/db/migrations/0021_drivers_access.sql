CREATE TYPE "public"."driver_status" AS ENUM('active', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."rfid_card_status" AS ENUM('active', 'blocked', 'lost');--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"reference" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" "driver_status" DEFAULT 'active' NOT NULL,
	"blocked_at" timestamp with time zone,
	"blocked_by" uuid,
	"block_reason" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drivers_tenant_id_unique" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
ALTER TABLE "drivers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rfid_cards" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"id_tag" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"status" "rfid_card_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rfid_cards_tenant_id_unique" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
ALTER TABLE "rfid_cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "access_group_members" (
	"tenant_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	CONSTRAINT "access_group_members_pk" PRIMARY KEY("group_id","driver_id")
);
--> statement-breakpoint
ALTER TABLE "access_group_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "access_group_sites" (
	"tenant_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	CONSTRAINT "access_group_sites_pk" PRIMARY KEY("group_id","site_id")
);
--> statement-breakpoint
ALTER TABLE "access_group_sites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "access_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_groups_tenant_id_unique" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
ALTER TABLE "access_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "driver_id" uuid;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "rfid_card_id" uuid;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_blocked_by_user_accounts_id_fk" FOREIGN KEY ("blocked_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_created_by_user_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_updated_by_user_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfid_cards" ADD CONSTRAINT "rfid_cards_created_by_user_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfid_cards" ADD CONSTRAINT "rfid_cards_driver_fk" FOREIGN KEY ("tenant_id","driver_id") REFERENCES "public"."drivers"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_group_members" ADD CONSTRAINT "access_group_members_group_fk" FOREIGN KEY ("tenant_id","group_id") REFERENCES "public"."access_groups"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_group_members" ADD CONSTRAINT "access_group_members_driver_fk" FOREIGN KEY ("tenant_id","driver_id") REFERENCES "public"."drivers"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_group_sites" ADD CONSTRAINT "access_group_sites_group_fk" FOREIGN KEY ("tenant_id","group_id") REFERENCES "public"."access_groups"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_group_sites" ADD CONSTRAINT "access_group_sites_site_fk" FOREIGN KEY ("tenant_id","site_id") REFERENCES "public"."sites"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_groups" ADD CONSTRAINT "access_groups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_groups" ADD CONSTRAINT "access_groups_created_by_user_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_groups" ADD CONSTRAINT "access_groups_updated_by_user_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "drivers_email_unique" ON "drivers" USING btree ("tenant_id",lower("email")) WHERE "drivers"."deleted_at" is null and "drivers"."email" is not null;--> statement-breakpoint
CREATE INDEX "drivers_name_idx" ON "drivers" USING btree ("tenant_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "rfid_cards_tag_unique" ON "rfid_cards" USING btree ("tenant_id",lower("id_tag"));--> statement-breakpoint
CREATE INDEX "rfid_cards_driver_idx" ON "rfid_cards" USING btree ("tenant_id","driver_id");--> statement-breakpoint
CREATE UNIQUE INDEX "access_groups_name_unique" ON "access_groups" USING btree ("tenant_id",lower("name"));--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD CONSTRAINT "charging_sessions_driver_fk" FOREIGN KEY ("tenant_id","driver_id") REFERENCES "public"."drivers"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD CONSTRAINT "charging_sessions_rfid_card_fk" FOREIGN KEY ("tenant_id","rfid_card_id") REFERENCES "public"."rfid_cards"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "charging_sessions_driver_idx" ON "charging_sessions" USING btree ("tenant_id","driver_id","started_at");--> statement-breakpoint
CREATE POLICY "drivers_tenant_isolation" ON "drivers" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("drivers"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("drivers"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "rfid_cards_tenant_isolation" ON "rfid_cards" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("rfid_cards"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("rfid_cards"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "access_group_members_tenant_isolation" ON "access_group_members" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("access_group_members"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("access_group_members"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "access_group_sites_tenant_isolation" ON "access_group_sites" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("access_group_sites"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("access_group_sites"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "access_groups_tenant_isolation" ON "access_groups" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("access_groups"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("access_groups"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);