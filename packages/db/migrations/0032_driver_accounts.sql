CREATE TYPE "public"."driver_payment_mode" AS ENUM('inherit', 'pay', 'free');--> statement-breakpoint
ALTER TYPE "public"."audit_actor_type" ADD VALUE 'driver';--> statement-breakpoint
CREATE TABLE "driver_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"keycloak_id" text,
	"email" text NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"phone" text,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "driver_accounts_keycloak_id_unique" UNIQUE("keycloak_id")
);
--> statement-breakpoint
CREATE TABLE "driver_invitations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token_hash" text,
	"invited_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "driver_invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "driver_invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "payment_mode" "driver_payment_mode" DEFAULT 'inherit' NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "driver_account_id" uuid;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "linked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rfid_cards" ADD COLUMN "payment_mode" "driver_payment_mode" DEFAULT 'inherit' NOT NULL;--> statement-breakpoint
ALTER TABLE "access_groups" ADD COLUMN "payment_mode" "driver_payment_mode" DEFAULT 'inherit' NOT NULL;--> statement-breakpoint
ALTER TABLE "access_groups" ADD COLUMN "hold_amount" bigint;--> statement-breakpoint
ALTER TABLE "driver_invitations" ADD CONSTRAINT "driver_invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_invitations" ADD CONSTRAINT "driver_invitations_invited_by_user_accounts_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_invitations" ADD CONSTRAINT "driver_invitations_driver_fk" FOREIGN KEY ("tenant_id","driver_id") REFERENCES "public"."drivers"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "driver_accounts_email_unique" ON "driver_accounts" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "driver_invitations_driver_idx" ON "driver_invitations" USING btree ("tenant_id","driver_id");--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_driver_account_id_driver_accounts_id_fk" FOREIGN KEY ("driver_account_id") REFERENCES "public"."driver_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "drivers_account_unique" ON "drivers" USING btree ("tenant_id","driver_account_id") WHERE "drivers"."deleted_at" is null and "drivers"."driver_account_id" is not null;--> statement-breakpoint
ALTER TABLE "access_groups" ADD CONSTRAINT "access_groups_hold_amount_positive" CHECK ("access_groups"."hold_amount" is null or "access_groups"."hold_amount" > 0);--> statement-breakpoint
CREATE POLICY "drivers_own_account" ON "drivers" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING ("drivers"."driver_account_id" = nullif(current_setting('app.driver_account_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "driver_invitations_tenant_isolation" ON "driver_invitations" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("driver_invitations"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("driver_invitations"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "driver_invitations_holder" ON "driver_invitations" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING ("driver_invitations"."token_hash" = nullif(current_setting('app.invite_token_hash', true), ''));