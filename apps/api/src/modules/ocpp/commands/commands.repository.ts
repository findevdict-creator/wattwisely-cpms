import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, lt, SQL, sql } from 'drizzle-orm';
import { chargerCommands, Transaction } from '@wattwisely/db';
import { CommandAction, CommandStatus } from '@wattwisely/ocpp-contracts';
import { ListCursor } from '../../../common/paging/list-cursor';
import { CommandRecord } from './command-record';

/** How a command history is narrowed. */
export interface CommandFilter {
  chargerId: string;
  actions?: CommandAction[];
  statuses?: CommandStatus[];
}

/** Reads and writes charger_commands for the API side. RLS limits every query to the current tenant. */
@Injectable()
export class CommandsRepository {
  static readonly COLUMNS = {
    id: chargerCommands.id,
    chargerId: chargerCommands.chargerId,
    action: chargerCommands.action,
    payload: chargerCommands.payload,
    status: chargerCommands.status,
    queuedUntil: chargerCommands.queuedUntil,
    requestedBy: chargerCommands.requestedBy,
    requestedByLabel: chargerCommands.requestedByLabel,
    result: chargerCommands.result,
    error: chargerCommands.error,
    sentAt: chargerCommands.sentAt,
    completedAt: chargerCommands.completedAt,
    createdAt: chargerCommands.createdAt,
    updatedAt: chargerCommands.updatedAt,
  };

  async insert(tx: Transaction, row: typeof chargerCommands.$inferInsert): Promise<CommandRecord> {
    const rows = await tx.insert(chargerCommands).values(row).returning(CommandsRepository.COLUMNS);
    return rows[0] as CommandRecord;
  }

  async findById(tx: Transaction, id: string): Promise<CommandRecord | null> {
    const rows = await tx
      .select(CommandsRepository.COLUMNS)
      .from(chargerCommands)
      .where(eq(chargerCommands.id, id));
    return (rows[0] as CommandRecord | undefined) ?? null;
  }

  /** Newest first; the cursor is the created_at and id of the last row seen. */
  async findPage(
    tx: Transaction,
    filter: CommandFilter,
    cursor: ListCursor | null,
    limit: number,
  ): Promise<CommandRecord[]> {
    const rows = await tx
      .select(CommandsRepository.COLUMNS)
      .from(chargerCommands)
      .where(and(...CommandsRepository.conditions(filter, cursor)))
      .orderBy(desc(chargerCommands.createdAt), desc(chargerCommands.id))
      .limit(limit);
    return rows as CommandRecord[];
  }

  /**
   * A queued command the gateway never picked up (the charger stayed offline) expires
   * once its wait is over. Done when the command is read, so the status is always right.
   */
  async expireIfDue(tx: Transaction, command: CommandRecord): Promise<CommandRecord> {
    if (command.status !== 'queued' || command.queuedUntil.getTime() > Date.now()) {
      return command;
    }
    const rows = await tx
      .update(chargerCommands)
      .set({
        status: 'expired',
        error: 'The charger did not reconnect in time.',
        completedAt: sql`now()`,
      })
      .where(
        and(
          eq(chargerCommands.id, command.id),
          eq(chargerCommands.status, 'queued'),
          lt(chargerCommands.queuedUntil, sql`now()`),
        ),
      )
      .returning(CommandsRepository.COLUMNS);
    return (rows[0] as CommandRecord | undefined) ?? command;
  }

  private static conditions(filter: CommandFilter, cursor: ListCursor | null): (SQL | undefined)[] {
    return [
      eq(chargerCommands.chargerId, filter.chargerId),
      filter.actions ? inArray(chargerCommands.action, filter.actions) : undefined,
      filter.statuses ? inArray(chargerCommands.status, filter.statuses) : undefined,
      cursor
        ? sql`(${chargerCommands.createdAt}, ${chargerCommands.id}) < (${cursor.key}::timestamptz, ${cursor.id}::uuid)`
        : undefined,
    ];
  }
}
