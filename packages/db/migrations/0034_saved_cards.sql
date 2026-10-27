CREATE TYPE "public"."payment_method_status" AS ENUM('active', 'removed');--> statement-breakpoint
CREATE TYPE "public"."session_start_source" AS ENUM('rfid_card', 'guest_card', 'chat', 'account', 'staff');--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY NOT NULL,
	"driver_account_id" uuid NOT NULL,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"provider_payment_method_id" text NOT NULL,
	"brand" text NOT NULL,
	"last4" text NOT NULL,
	"exp_month" integer NOT NULL,
	"exp_year" integer NOT NULL,
	"status" "payment_method_status" DEFAULT 'active' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "start_source" "session_start_source";--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD COLUMN "payment_rule" jsonb;--> statement-breakpoint
ALTER TABLE "payment_accounts" ADD COLUMN "member_hold_amount" bigint DEFAULT 5000 NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_method_id" uuid;--> statement-breakpoint
ALTER TABLE "driver_accounts" ADD COLUMN "payment_customer_id" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "is_guest" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_driver_account_id_driver_accounts_id_fk" FOREIGN KEY ("driver_account_id") REFERENCES "public"."driver_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_provider_unique" ON "payment_methods" USING btree ("provider_payment_method_id");--> statement-breakpoint
CREATE INDEX "payment_methods_account_idx" ON "payment_methods" USING btree ("driver_account_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_default_unique" ON "payment_methods" USING btree ("driver_account_id") WHERE "payment_methods"."status" = 'active' and "payment_methods"."is_default";--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_member_hold_positive" CHECK ("payment_accounts"."member_hold_amount" > 0);