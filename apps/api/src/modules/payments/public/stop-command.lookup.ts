import { and, eq, inArray, sql } from 'drizzle-orm';
import { chargerCommands, Transaction } from '@wattwisely/db';
import { CommandStatus } from '@wattwisely/ocpp-contracts';

/** Whether a RemoteStop for a session is on its way: queued, sent, or accepted but not yet reported. */
export class StopCommandLookup {
  static readonly ON_THE_WAY: CommandStatus[] = ['queued', 'sent', 'accepted'];

  async isPending(tx: Transaction, sessionId: string): Promise<boolean> {
    const rows = await tx
      .select({ id: chargerCommands.id })
      .from(chargerCommands)
      .where(
        and(
          eq(chargerCommands.action, 'remote_stop'),
          eq(sql`${chargerCommands.payload}->>'session_id'`, sessionId),
          inArray(chargerCommands.status, StopCommandLookup.ON_THE_WAY),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }
}
