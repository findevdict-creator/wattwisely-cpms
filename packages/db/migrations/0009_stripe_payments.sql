-- Module 6, Stripe payments: the tenant's connected account, one payment per paid session,
-- refunds, and the provider's webhook events (global, stored once). A paid session exists
-- before the charger starts it, so its OCPP transaction id and start reading may be empty.
CREATE TYPE "public"."payment_account_status" AS ENUM('pending', 'active', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('direct', 'own_provider', 'managed');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'authorised', 'captured', 'released', 'failed', 'capture_failed', 'partially_refunded', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('preauth', 'prepay', 'postpay');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('awaiting_approval', 'pending', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "payment_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"provider_account_id" text NOT NULL,
	"status" "payment_account_status" DEFAULT 'pending' NOT NULL,
	"is_charges_enabled" boolean DEFAULT false NOT NULL,
	"is_payouts_enabled" boolean DEFAULT false NOT NULL,
	"is_details_submitted" boolean DEFAULT false NOT NULL,
	"requirements" jsonb DEFAULT '{"currentlyDue":[],"pastDue":[],"disabledReason":null}'::jsonb NOT NULL,
	"country" text NOT NULL,
	"default_currency" text,
	"hold_amount" bigint DEFAULT 5000 NOT NULL,
	"connected_by" uuid,
	"last_synced_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_accounts_tenant_unique" UNIQUE("tenant_id"),
	CONSTRAINT "payment_accounts_provider_account_unique" UNIQUE("provider","provider_account_id"),
	CONSTRAINT "payment_accounts_hold_positive" CHECK ("payment_accounts"."hold_amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "payment_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"type" "payment_type" DEFAULT 'preauth' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"currency" text NOT NULL,
	"hold_amount" bigint NOT NULL,
	"authorized_amount" bigint,
	"captured_amount" bigint,
	"refunded_amount" bigint DEFAULT 0 NOT NULL,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"provider_account_id" text NOT NULL,
	"provider_payment_id" text NOT NULL,
	"card_brand" text,
	"card_last4" text,
	"failure_code" text,
	"failure_message" text,
	"access_key_hash" text NOT NULL,
	"capture_attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"auto_stop_requested_at" timestamp with time zone,
	"authorized_at" timestamp with time zone,
	"captured_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"review_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "payments_provider_payment_unique" UNIQUE("tenant_id","provider_payment_id")
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"reason" text NOT NULL,
	"status" "refund_status" DEFAULT 'awaiting_approval' NOT NULL,
	"requested_by" uuid,
	"requested_by_label" text NOT NULL,
	"approved_by" uuid,
	"approved_by_label" text,
	"provider_refund_id" text,
	"failure_message" text,
	"approved_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "refunds_provider_refund_unique" UNIQUE("tenant_id","provider_refund_id"),
	CONSTRAINT "refunds_amount_positive" CHECK ("refunds"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "refunds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"provider_account_id" text,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_webhook_events_event_unique" UNIQUE("provider","event_id")
);
--> statement-breakpoint
ALTER TABLE "charging_sessions" ALTER COLUMN "ocpp_transaction_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "charging_sessions" ALTER COLUMN "meter_start_wh" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "payment_mode" "payment_mode" DEFAULT 'direct' NOT NULL;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "is_paid" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_connected_by_user_accounts_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_session_fk" FOREIGN KEY ("tenant_id","session_id") REFERENCES "public"."charging_sessions"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_requested_by_user_accounts_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_approved_by_user_accounts_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_fk" FOREIGN KEY ("tenant_id","payment_id") REFERENCES "public"."payments"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_session_preauth_unique" ON "payments" USING btree ("tenant_id","session_id") WHERE "payments"."type" = 'preauth';--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("tenant_id","status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "payments_created_idx" ON "payments" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "refunds_payment_idx" ON "refunds" USING btree ("tenant_id","payment_id");--> statement-breakpoint
CREATE INDEX "refunds_status_idx" ON "refunds" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "payment_webhook_events_pending_idx" ON "payment_webhook_events" USING btree ("next_attempt_at") WHERE "payment_webhook_events"."processed_at" is null;--> statement-breakpoint
CREATE POLICY "payment_accounts_tenant_isolation" ON "payment_accounts" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("payment_accounts"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("payment_accounts"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "payment_accounts_provider_lookup" ON "payment_accounts" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING ("payment_accounts"."provider_account_id" = nullif(current_setting('app.provider_account_id', true), ''));--> statement-breakpoint
CREATE POLICY "payments_tenant_isolation" ON "payments" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("payments"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("payments"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "refunds_tenant_isolation" ON "refunds" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("refunds"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("refunds"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);