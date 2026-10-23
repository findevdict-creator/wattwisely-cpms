ALTER TABLE "report_exports" ADD COLUMN "storage_key" text;--> statement-breakpoint
CREATE INDEX "ocpp_messages_received_idx" ON "ocpp_messages" USING btree ("tenant_id","received_at");--> statement-breakpoint
CREATE INDEX "staff_notifications_created_idx" ON "staff_notifications" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_created_idx" ON "notifications" USING btree ("tenant_id","created_at");