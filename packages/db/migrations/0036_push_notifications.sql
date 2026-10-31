CREATE TYPE "public"."device_platform" AS ENUM('android', 'ios');--> statement-breakpoint
CREATE TABLE "driver_devices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"driver_account_id" uuid NOT NULL,
	"platform" "device_platform" NOT NULL,
	"token" text NOT NULL,
	"invalid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_deliveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"driver_account_id" uuid NOT NULL,
	"sent_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_deliveries_session_kind_unique" UNIQUE("tenant_id","session_id","kind")
);
--> statement-breakpoint
ALTER TABLE "push_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "driver_accounts" ADD COLUMN "wants_started" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "driver_accounts" ADD COLUMN "wants_nearly_full" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "driver_accounts" ADD COLUMN "wants_finished" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "driver_accounts" ADD COLUMN "wants_idle_warning" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "driver_accounts" ADD COLUMN "is_push_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "driver_accounts" ADD COLUMN "is_email_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "driver_devices" ADD CONSTRAINT "driver_devices_driver_account_id_driver_accounts_id_fk" FOREIGN KEY ("driver_account_id") REFERENCES "public"."driver_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_session_fk" FOREIGN KEY ("tenant_id","session_id") REFERENCES "public"."charging_sessions"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "driver_devices_token_unique" ON "driver_devices" USING btree ("token");--> statement-breakpoint
CREATE INDEX "driver_devices_account_idx" ON "driver_devices" USING btree ("driver_account_id");--> statement-breakpoint
CREATE POLICY "push_deliveries_tenant_isolation" ON "push_deliveries" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("push_deliveries"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("push_deliveries"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);