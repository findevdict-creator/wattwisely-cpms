import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { Transaction, UuidV7, webhookDeliveries, webhookEndpoints } from '@wattwisely/db';
import { WebhookErrors } from './webhook-errors';
import { WebhookDeliveryRecord, WebhookRecord } from './webhook-record';

/** Reads and writes a tenant's webhook endpoints and reads their deliveries (module 16). */
@Injectable()
export class WebhooksRepository {
  async findAll(tx: Transaction, endpointId?: string): Promise<WebhookRecord[]> {
    return tx
      .select({
        id: webhookEndpoints.id,
        tenantId: webhookEndpoints.tenantId,
        url: webhookEndpoints.url,
        description: webhookEndpoints.description,
        secret: webhookEndpoints.secret,
        eventTypes: webhookEndpoints.eventTypes,
        isActive: webhookEndpoints.isActive,
        failureCount: webhookEndpoints.failureCount,
        lastDeliveryAt: webhookEndpoints.lastDeliveryAt,
        version: webhookEndpoints.version,
        createdAt: webhookEndpoints.createdAt,
        updatedAt: webhookEndpoints.updatedAt,
      })
      .from(webhookEndpoints)
      .where(endpointId ? eq(webhookEndpoints.id, endpointId) : undefined)
      .orderBy(asc(webhookEndpoints.createdAt), asc(webhookEndpoints.id));
  }

  async findById(tx: Transaction, endpointId: string): Promise<WebhookRecord | null> {
    return (await this.findAll(tx, endpointId))[0] ?? null;
  }

  /** The endpoint, or 404 when it is not the tenant's. */
  async require(tx: Transaction, endpointId: string): Promise<WebhookRecord> {
    const record = UuidV7.isUuid(endpointId) ? await this.findById(tx, endpointId) : null;
    if (!record) {
      throw WebhookErrors.notFound();
    }
    return record;
  }

  async insert(tx: Transaction, row: typeof webhookEndpoints.$inferInsert): Promise<void> {
    await tx.insert(webhookEndpoints).values(row);
  }

  /** Applies the changes when the version still matches; false when someone else saved first. */
  async update(
    tx: Transaction,
    endpointId: string,
    version: number,
    changes: Partial<typeof webhookEndpoints.$inferInsert>,
  ): Promise<boolean> {
    const rows = await tx
      .update(webhookEndpoints)
      .set({ ...changes, version: sql`${webhookEndpoints.version} + 1`, updatedAt: new Date() })
      .where(and(eq(webhookEndpoints.id, endpointId), eq(webhookEndpoints.version, version)))
      .returning({ id: webhookEndpoints.id });
    return rows.length === 1;
  }

  /** The deliveries go with it (ON DELETE CASCADE). */
  async remove(tx: Transaction, endpointId: string): Promise<void> {
    await tx.delete(webhookEndpoints).where(eq(webhookEndpoints.id, endpointId));
  }

  /** The newest deliveries of one endpoint. */
  async findDeliveries(
    tx: Transaction,
    endpointId: string,
    limit: number,
  ): Promise<WebhookDeliveryRecord[]> {
    return tx
      .select({
        id: webhookDeliveries.id,
        endpointId: webhookDeliveries.endpointId,
        eventType: webhookDeliveries.eventType,
        eventId: webhookDeliveries.eventId,
        payload: webhookDeliveries.payload,
        status: webhookDeliveries.status,
        attempts: webhookDeliveries.attempts,
        nextAttemptAt: webhookDeliveries.nextAttemptAt,
        lastAttemptAt: webhookDeliveries.lastAttemptAt,
        lastStatusCode: webhookDeliveries.lastStatusCode,
        lastError: webhookDeliveries.lastError,
        deliveredAt: webhookDeliveries.deliveredAt,
        createdAt: webhookDeliveries.createdAt,
      })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.endpointId, endpointId))
      .orderBy(desc(webhookDeliveries.createdAt), desc(webhookDeliveries.id))
      .limit(limit);
  }

  async insertDelivery(tx: Transaction, row: typeof webhookDeliveries.$inferInsert): Promise<void> {
    await tx.insert(webhookDeliveries).values(row);
  }
}
