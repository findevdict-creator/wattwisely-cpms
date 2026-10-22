CREATE TYPE "public"."audit_actor_type" AS ENUM('user', 'api_key', 'support', 'system');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('invited', 'active', 'removed');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('trial', 'active', 'suspended', 'cancelled');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "tenant_status" DEFAULT 'active' NOT NULL,
	"region" text,
	"keycloak_organization_id" text,
	"deleted_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tenants_keycloak_organization_id_unique" UNIQUE("keycloak_organization_id")
);
--> statement-breakpoint
CREATE TABLE "user_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"keycloak_id" text,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"is_platform_staff" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_accounts_keycloak_id_unique" UNIQUE("keycloak_id")
);
--> statement-breakpoint
CREATE TABLE "tenant_memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_account_id" uuid NOT NULL,
	"status" "membership_status" NOT NULL,
	"invited_by" uuid,
	"invited_at" timestamp with time zone,
	"invite_token_hash" text,
	"invite_expires_at" timestamp with time zone,
	"joined_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"removed_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_memberships_invite_token_hash_unique" UNIQUE("invite_token_hash"),
	CONSTRAINT "tenant_memberships_person_unique" UNIQUE("tenant_id","user_account_id"),
	CONSTRAINT "tenant_memberships_tenant_id_unique" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
ALTER TABLE "tenant_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"key" text,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_system" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_key_unique" UNIQUE("key"),
	CONSTRAINT "roles_system_or_tenant" CHECK (("roles"."is_system" and "roles"."tenant_id" is null and "roles"."key" is not null)
        or (not "roles"."is_system" and "roles"."tenant_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role_id" uuid NOT NULL,
	"tenant_id" uuid,
	"permission_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_unique" UNIQUE("role_id","permission_key")
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "membership_roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"site_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_roles_unique" UNIQUE NULLS NOT DISTINCT("membership_id","role_id","site_id")
);
--> statement-breakpoint
ALTER TABLE "membership_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_id" uuid,
	"actor_label" text DEFAULT '' NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"target_label" text,
	"before" jsonb,
	"after" jsonb,
	"ip" text,
	"request_id" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_account_id_user_accounts_id_fk" FOREIGN KEY ("user_account_id") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_invited_by_user_accounts_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_removed_by_user_accounts_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_created_by_user_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_membership_fk" FOREIGN KEY ("tenant_id","membership_id") REFERENCES "public"."tenant_memberships"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_accounts_email_unique" ON "user_accounts" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "tenant_memberships_status_idx" ON "tenant_memberships" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "tenant_memberships_user_idx" ON "tenant_memberships" USING btree ("user_account_id");--> statement-breakpoint
CREATE INDEX "membership_roles_membership_idx" ON "membership_roles" USING btree ("tenant_id","membership_id");--> statement-breakpoint
CREATE INDEX "audit_log_tenant_time_idx" ON "audit_log" USING btree ("tenant_id","occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("tenant_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("tenant_id","actor_id");--> statement-breakpoint
CREATE POLICY "tenant_memberships_tenant_isolation" ON "tenant_memberships" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("tenant_memberships"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("tenant_memberships"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_memberships_own_rows" ON "tenant_memberships" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING ("tenant_memberships"."user_account_id" = nullif(current_setting('app.user_account_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_memberships_invitation_holder" ON "tenant_memberships" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING ("tenant_memberships"."invite_token_hash" = nullif(current_setting('app.invite_token_hash', true), ''));--> statement-breakpoint
CREATE POLICY "roles_visible" ON "roles" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING ("roles"."tenant_id" is null or "roles"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "role_permissions_visible" ON "role_permissions" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING ("role_permissions"."tenant_id" is null or "role_permissions"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "membership_roles_tenant_isolation" ON "membership_roles" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING ("membership_roles"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("membership_roles"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "audit_log_tenant_read" ON "audit_log" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING ("audit_log"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "audit_log_tenant_append" ON "audit_log" AS PERMISSIVE FOR INSERT TO "wattwisely_app" WITH CHECK ("audit_log"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid);