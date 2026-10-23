import { and, eq, sql } from 'drizzle-orm';
import { chargerCommands, connectors, Transaction, UuidV7 } from '@wattwisely/db';
import {
  CommandAction,
  CommandCatalog,
  CommandNotification,
  CommandPayload,
  CommandStatus,
  NotifyChannels,
} from '@wattwisely/ocpp-contracts';
import { SessionRow } from '@wattwisely/session-engine';

/**
 * Queues the commands a paid session needs, the way the API does for staff: a row in
 * charger_commands and a NOTIFY to the gateway, inside the caller's transaction. The
 * remote start carries the session's own tag, so the gateway links the start to it.
 */
export class CommandQueuer {
  static readonly REQUESTED_BY = 'Driver payment';

  /** RemoteStartTransaction on the session's connector; returns the command id. */
  async remoteStart(tx: Transaction, session: SessionRow): Promise<string> {
    const rows = await tx
      .select({ ocppConnectorId: connectors.ocppConnectorId })
      .from(connectors)
      .where(eq(connectors.id, session.connectorId));
    const connector = rows[0];
    if (!connector) {
      throw new Error(`Connector ${session.connectorId} is gone`);
    }
    return this.queue(tx, session, 'remote_start', {
      ocpp_connector_id: connector.ocppConnectorId,
      id_tag: session.idTag,
    });
  }

  /** RemoteStopTransaction for the running transaction. */
  remoteStop(tx: Transaction, session: SessionRow, ocppTransactionId: number): Promise<string> {
    return this.queue(tx, session, 'remote_stop', {
      ocpp_transaction_id: ocppTransactionId,
      session_id: session.id,
    });
  }

  async statusOf(tx: Transaction, commandId: string): Promise<CommandStatus | null> {
    const rows = await tx
      .select({ status: chargerCommands.status })
      .from(chargerCommands)
      .where(eq(chargerCommands.id, commandId));
    return rows[0]?.status ?? null;
  }

  /** A start the session no longer waits for must not start the charger later. */
  async expireQueued(tx: Transaction, commandId: string): Promise<void> {
    await tx
      .update(chargerCommands)
      .set({
        status: 'expired',
        error: 'The session was given up before the charger took the command.',
        completedAt: sql`now()`,
      })
      .where(and(eq(chargerCommands.id, commandId), eq(chargerCommands.status, 'queued')));
  }

  private async queue(
    tx: Transaction,
    session: SessionRow,
    action: CommandAction,
    payload: CommandPayload,
  ): Promise<string> {
    const id = UuidV7.create();
    await tx.insert(chargerCommands).values({
      id,
      tenantId: session.tenantId,
      chargerId: session.chargerId,
      action,
      payload,
      queuedUntil: new Date(Date.now() + CommandCatalog.QUEUE_MINUTES * 60_000),
      requestedBy: null,
      requestedByLabel: CommandQueuer.REQUESTED_BY,
    });
    const notification: CommandNotification = {
      command_id: id,
      charger_id: session.chargerId,
      tenant_id: session.tenantId,
    };
    await tx.execute(
      sql`select pg_notify(${NotifyChannels.COMMANDS}, ${JSON.stringify(notification)})`,
    );
    return id;
  }
}
