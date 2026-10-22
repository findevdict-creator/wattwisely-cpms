import { sql } from 'drizzle-orm';
import { Transaction } from '@wattwisely/db';
import { ChargerEvent, ChargerEventType, NotifyChannels } from '@wattwisely/ocpp-contracts';

/**
 * Announces what happened on a charger over Postgres NOTIFY, inside the transaction
 * that recorded it, so listeners (the API's live streams) hear of it exactly when it
 * is committed and never of a change that rolled back. The gateway and the worker
 * both publish through it.
 */
export class ChargerEventNotifier {
  async publish(
    tx: Transaction,
    charger: { id: string; tenantId: string },
    type: ChargerEventType,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    const event: ChargerEvent = {
      type,
      tenant_id: charger.tenantId,
      charger_id: charger.id,
      at: new Date().toISOString(),
      data,
    };
    const payload = JSON.stringify(event);
    if (Buffer.byteLength(payload) > NotifyChannels.MAX_PAYLOAD_BYTES) {
      return;
    }
    await tx.execute(sql`select pg_notify(${NotifyChannels.EVENTS}, ${payload})`);
  }
}
