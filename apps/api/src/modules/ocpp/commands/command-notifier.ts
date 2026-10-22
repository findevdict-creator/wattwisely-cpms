import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Transaction } from '@wattwisely/db';
import { CommandNotification, NotifyChannels } from '@wattwisely/ocpp-contracts';

/**
 * Tells the gateway a command row is waiting, over Postgres NOTIFY. Sent inside the
 * command's transaction, so Postgres delivers it only once the row is committed.
 */
@Injectable()
export class CommandNotifier {
  async notify(tx: Transaction, notification: CommandNotification): Promise<void> {
    await tx.execute(
      sql`select pg_notify(${NotifyChannels.COMMANDS}, ${JSON.stringify(notification)})`,
    );
  }
}
