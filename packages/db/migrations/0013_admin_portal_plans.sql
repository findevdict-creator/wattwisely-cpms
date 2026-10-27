-- Module 9, the admin console: the plan catalogue (plans, addons), each tenant's plan
-- (tenant_subscriptions) and its modules beyond the plan (tenant_entitlements), Wattwisely's
-- own staff (platform_staff), and a new row-level security setting, app.platform_access,
-- set only in admin console requests. Tenants gain row-level security too: everyone may
-- read them, only platform staff may create or change them.
CREATE TYPE "public"."addon_pricing_unit" AS ENUM('per_connector', 'per_site', 'per_tenant');--> statement-breakpoint
CREATE TYPE "public"."entitlement_source" AS ENUM('addon', 'trial', 'override');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('admin', 'billing', 'support', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."audit_actor_type" ADD VALUE 'platform';--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"platform_fee" integer DEFAULT 0 NOT NULL,
	"ac_connector_fee" integer DEFAULT 0 NOT NULL,
	"dc_connector_fee" integer DEFAULT 0 NOT NULL,
	"revenue_share_bps" integer DEFAULT 0 NOT NULL,
	"connector_limit" integer,
	"user_limit" integer,
	"module_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_code_unique" UNIQUE("code"),
	CONSTRAINT "plans_currency_code" CHECK ("plans"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "plans_fees_positive" CHECK ("plans"."platform_fee" >= 0 and "plans"."ac_connector_fee" >= 0 and "plans"."dc_connector_fee" >= 0),
	CONSTRAINT "plans_revenue_share_range" CHECK ("plans"."revenue_share_bps" between 0 and 10000),
	CONSTRAINT "plans_limits_positive" CHECK (("plans"."connector_limit" is null or "plans"."connector_limit" > 0) and ("plans"."user_limit" is null or "plans"."user_limit" > 0))
);
--> statement-breakpoint
ALTER TABLE "plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "addons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"pricing_unit" "addon_pricing_unit" DEFAULT 'per_tenant' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "addons_key_unique" UNIQUE("key"),
	CONSTRAINT "addons_currency_code" CHECK ("addons"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "addons_price_positive" CHECK ("addons"."price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "addons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tenant_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"billing_email" text,
	"billing_name" text,
	"billing_reference" text,
	"notes" text DEFAULT '' NOT NULL,
	"updated_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_subscriptions_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tenant_entitlements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"feature_key" text NOT NULL,
	"source" "entitlement_source" NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"ends_at" timestamp with time zone,
	"note" text DEFAULT '' NOT NULL,
	"granted_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_entitlements_feature_unique" UNIQUE("tenant_id","feature_key")
);
--> statement-breakpoint
ALTER TABLE "tenant_entitlements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "platform_staff" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_account_id" uuid NOT NULL,
	"role" "platform_role" NOT NULL,
	"granted_by" uuid,
	"removed_at" timestamp with time zone,
	"removed_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_staff_user_account_id_unique" UNIQUE("user_account_id")
);
--> statement-breakpoint
ALTER TABLE "platform_staff" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_updated_by_user_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_entitlements" ADD CONSTRAINT "tenant_entitlements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_entitlements" ADD CONSTRAINT "tenant_entitlements_granted_by_user_accounts_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_staff" ADD CONSTRAINT "platform_staff_user_account_id_user_accounts_id_fk" FOREIGN KEY ("user_account_id") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_staff" ADD CONSTRAINT "platform_staff_granted_by_user_accounts_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_staff" ADD CONSTRAINT "platform_staff_removed_by_user_accounts_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "tenants_visible" ON "tenants" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING (true);--> statement-breakpoint
CREATE POLICY "tenants_platform_insert" ON "tenants" AS PERMISSIVE FOR INSERT TO "wattwisely_app" WITH CHECK (current_setting('app.platform_access', true) = 'true');--> statement-breakpoint
CREATE POLICY "tenants_platform_update" ON "tenants" AS PERMISSIVE FOR UPDATE TO "wattwisely_app" USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true');--> statement-breakpoint
CREATE POLICY "audit_log_platform_read" ON "audit_log" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING (current_setting('app.platform_access', true) = 'true');--> statement-breakpoint
CREATE POLICY "audit_log_platform_append" ON "audit_log" AS PERMISSIVE FOR INSERT TO "wattwisely_app" WITH CHECK (current_setting('app.platform_access', true) = 'true');--> statement-breakpoint
CREATE POLICY "plans_visible" ON "plans" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING (true);--> statement-breakpoint
CREATE POLICY "plans_platform_insert" ON "plans" AS PERMISSIVE FOR INSERT TO "wattwisely_app" WITH CHECK (current_setting('app.platform_access', true) = 'true');--> statement-breakpoint
CREATE POLICY "plans_platform_update" ON "plans" AS PERMISSIVE FOR UPDATE TO "wattwisely_app" USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true');--> statement-breakpoint
CREATE POLICY "addons_visible" ON "addons" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING (true);--> statement-breakpoint
CREATE POLICY "addons_platform_insert" ON "addons" AS PERMISSIVE FOR INSERT TO "wattwisely_app" WITH CHECK (current_setting('app.platform_access', true) = 'true');--> statement-breakpoint
CREATE POLICY "addons_platform_update" ON "addons" AS PERMISSIVE FOR UPDATE TO "wattwisely_app" USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true');--> statement-breakpoint
CREATE POLICY "tenant_subscriptions_tenant_read" ON "tenant_subscriptions" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING ("tenant_subscriptions"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_subscriptions_platform_all" ON "tenant_subscriptions" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true');--> statement-breakpoint
CREATE POLICY "tenant_entitlements_tenant_read" ON "tenant_entitlements" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING ("tenant_entitlements"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_entitlements_platform_all" ON "tenant_entitlements" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true');--> statement-breakpoint
CREATE POLICY "platform_staff_visible" ON "platform_staff" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING ("platform_staff"."user_account_id" = nullif(current_setting('app.user_account_id', true), '')::uuid or current_setting('app.platform_access', true) = 'true');--> statement-breakpoint
CREATE POLICY "platform_staff_platform_insert" ON "platform_staff" AS PERMISSIVE FOR INSERT TO "wattwisely_app" WITH CHECK (current_setting('app.platform_access', true) = 'true');--> statement-breakpoint
CREATE POLICY "platform_staff_platform_update" ON "platform_staff" AS PERMISSIVE FOR UPDATE TO "wattwisely_app" USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true');