CREATE TYPE "public"."managed_service_status" AS ENUM('pending_acceptance', 'active', 'ending', 'ended', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."tariff_proposal_status" AS ENUM('proposed', 'approved', 'rejected', 'withdrawn');--> statement-breakpoint
ALTER TYPE "public"."audit_actor_type" ADD VALUE 'managed';--> statement-breakpoint
CREATE TABLE "managed_services" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"status" "managed_service_status" DEFAULT 'pending_acceptance' NOT NULL,
	"account_manager_id" uuid NOT NULL,
	"is_tariff_approval_required" boolean DEFAULT true NOT NULL,
	"agreement_reference" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"offered_by" uuid,
	"offered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_by" uuid,
	"accepted_at" timestamp with time zone,
	"notice_given_by" uuid,
	"notice_given_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "managed_services" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "managed_operators" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"managed_service_id" uuid NOT NULL,
	"user_account_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"assigned_by" uuid,
	"removed_at" timestamp with time zone,
	"removed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "managed_operators_live_unique" UNIQUE NULLS NOT DISTINCT("tenant_id","user_account_id","removed_at")
);
--> statement-breakpoint
ALTER TABLE "managed_operators" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tariff_proposals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"tariff_id" uuid,
	"name" text NOT NULL,
	"currency" text NOT NULL,
	"prices" jsonb NOT NULL,
	"status" "tariff_proposal_status" DEFAULT 'proposed' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"proposed_by" uuid NOT NULL,
	"proposed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"decision_comment" text DEFAULT '' NOT NULL,
	"applied_tariff_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tariff_proposals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "managed_services" ADD CONSTRAINT "managed_services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_services" ADD CONSTRAINT "managed_services_offered_by_user_accounts_id_fk" FOREIGN KEY ("offered_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_services" ADD CONSTRAINT "managed_services_accepted_by_user_accounts_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_services" ADD CONSTRAINT "managed_services_notice_given_by_user_accounts_id_fk" FOREIGN KEY ("notice_given_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_operators" ADD CONSTRAINT "managed_operators_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_operators" ADD CONSTRAINT "managed_operators_managed_service_id_managed_services_id_fk" FOREIGN KEY ("managed_service_id") REFERENCES "public"."managed_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_operators" ADD CONSTRAINT "managed_operators_user_account_id_user_accounts_id_fk" FOREIGN KEY ("user_account_id") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_operators" ADD CONSTRAINT "managed_operators_assigned_by_user_accounts_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_operators" ADD CONSTRAINT "managed_operators_removed_by_user_accounts_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managed_operators" ADD CONSTRAINT "managed_operators_membership_fk" FOREIGN KEY ("tenant_id","membership_id") REFERENCES "public"."tenant_memberships"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariff_proposals" ADD CONSTRAINT "tariff_proposals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariff_proposals" ADD CONSTRAINT "tariff_proposals_proposed_by_user_accounts_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariff_proposals" ADD CONSTRAINT "tariff_proposals_decided_by_user_accounts_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariff_proposals" ADD CONSTRAINT "tariff_proposals_tariff_fk" FOREIGN KEY ("tenant_id","tariff_id") REFERENCES "public"."tariffs"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "managed_services_tenant_idx" ON "managed_services" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "managed_services_ends_at_idx" ON "managed_services" USING btree ("ends_at");--> statement-breakpoint
CREATE INDEX "managed_operators_user_idx" ON "managed_operators" USING btree ("user_account_id");--> statement-breakpoint
CREATE INDEX "tariff_proposals_status_idx" ON "tariff_proposals" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE POLICY "platform_staff_account_manager_visible" ON "platform_staff" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING ("platform_staff"."id" in (select "managed_services"."account_manager_id" from "managed_services" where "managed_services"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid));--> statement-breakpoint
CREATE POLICY "managed_services_tenant_read" ON "managed_services" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING ("managed_services"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "managed_services_tenant_update" ON "managed_services" AS PERMISSIVE FOR UPDATE TO "wattwisely_app" USING ("managed_services"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("managed_services"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "managed_services_platform_all" ON "managed_services" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true');--> statement-breakpoint
CREATE POLICY "managed_operators_tenant_read" ON "managed_operators" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING ("managed_operators"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "managed_operators_platform_all" ON "managed_operators" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true');--> statement-breakpoint
CREATE POLICY "tariff_proposals_tenant_isolation" ON "tariff_proposals" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("tariff_proposals"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("tariff_proposals"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);