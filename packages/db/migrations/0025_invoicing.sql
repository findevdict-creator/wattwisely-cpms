CREATE TYPE "public"."invoice_line_kind" AS ENUM('platform_fee', 'ac_connector_fee', 'dc_connector_fee', 'addon', 'managed_service', 'revenue_share', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'issued', 'paid', 'void');--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"number" text,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"currency" text NOT NULL,
	"subtotal" bigint DEFAULT 0 NOT NULL,
	"tax_rate_bps" integer DEFAULT 0 NOT NULL,
	"tax_amount" bigint DEFAULT 0 NOT NULL,
	"total" bigint DEFAULT 0 NOT NULL,
	"billing_name" text,
	"billing_email" text,
	"billing_reference" text,
	"remarks" text DEFAULT '' NOT NULL,
	"issued_at" timestamp with time zone,
	"issued_by" uuid,
	"due_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"paid_by" uuid,
	"payment_reference" text,
	"voided_at" timestamp with time zone,
	"voided_by" uuid,
	"void_reason" text,
	"created_by" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_currency_code" CHECK ("invoices"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "invoices_tax_rate_range" CHECK ("invoices"."tax_rate_bps" between 0 and 10000),
	CONSTRAINT "invoices_period_order" CHECK ("invoices"."period_start" <= "invoices"."period_end"),
	CONSTRAINT "invoices_number_when_issued" CHECK (("invoices"."status" <> 'draft' or "invoices"."number" is null) and ("invoices"."status" not in ('issued', 'paid') or "invoices"."number" is not null))
);
--> statement-breakpoint
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"kind" "invoice_line_kind" NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(12, 3) DEFAULT 1 NOT NULL,
	"unit_price" integer,
	"amount" bigint NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "invoice_lines_position_unique" UNIQUE("invoice_id","position")
);
--> statement-breakpoint
ALTER TABLE "invoice_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "invoice_sequences" (
	"year" integer PRIMARY KEY NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_sequences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD COLUMN "tax_rate_bps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "managed_services" ADD COLUMN "monthly_fee" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_issued_by_user_accounts_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_paid_by_user_accounts_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_voided_by_user_accounts_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_user_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_unique" ON "invoices" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_period_unique" ON "invoices" USING btree ("tenant_id","period_start") WHERE "invoices"."status" <> 'void';--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status","due_at");--> statement-breakpoint
CREATE INDEX "invoices_tenant_idx" ON "invoices" USING btree ("tenant_id","period_start");--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tax_rate_range" CHECK ("tenant_subscriptions"."tax_rate_bps" between 0 and 10000);--> statement-breakpoint
ALTER TABLE "managed_services" ADD CONSTRAINT "managed_services_fee_positive" CHECK ("managed_services"."monthly_fee" >= 0);--> statement-breakpoint
CREATE POLICY "invoices_tenant_read" ON "invoices" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING ("invoices"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid and "invoices"."status" <> 'draft');--> statement-breakpoint
CREATE POLICY "invoices_platform_all" ON "invoices" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true');--> statement-breakpoint
CREATE POLICY "invoice_lines_tenant_read" ON "invoice_lines" AS PERMISSIVE FOR SELECT TO "wattwisely_app" USING ("invoice_lines"."tenant_id" = nullif(current_setting('app.tenant_id', true), '')::uuid and "invoice_lines"."invoice_id" in (select "invoices"."id" from "invoices" where "invoices"."status" <> 'draft'));--> statement-breakpoint
CREATE POLICY "invoice_lines_platform_all" ON "invoice_lines" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true');--> statement-breakpoint
CREATE POLICY "invoice_sequences_platform_all" ON "invoice_sequences" AS PERMISSIVE FOR ALL TO "wattwisely_app" USING (current_setting('app.platform_access', true) = 'true') WITH CHECK (current_setting('app.platform_access', true) = 'true');