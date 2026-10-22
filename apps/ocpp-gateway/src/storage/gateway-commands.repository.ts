import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { chargerCommands, Transaction } from '@wattwisely/db';
import { CommandAction, CommandPayload, CommandStatus } from '@wattwisely/ocpp-contracts';

/** A charger_commands row as the gateway works with it. */
export interface GatewayCommand {
  id: string;
  tenantId: string;
  chargerId: string;
  action: CommandAction;
  payload: CommandPayload;
  status: CommandStatus;
  queuedUntil: Date;
}

/** The gateway's reads and writes on charger_commands. */
@Injectable()
export class GatewayCommandsRepository {
  static readonly COLUMNS = {
    id: chargerCommands.id,
    tenantId: chargerCommands.tenantId,
    chargerId: chargerCommands.chargerId,
    action: chargerCommands.action,
    payload: chargerCommands.payload,
    status: chargerCommands.status,
    queuedUntil: chargerCommands.queuedUntil,
  };

  async findById(tx: Transaction, id: string): Promise<GatewayCommand | null> {
    const rows = await tx
      .select(GatewayCommandsRepository.COLUMNS)
      .from(chargerCommands)
      .where(eq(chargerCommands.id, id));
    return (rows[0] as GatewayCommand | undefined) ?? null;
  }

  /** Every command still waiting for this charger, oldest first. */
  async findQueued(tx: Transaction, chargerId: string): Promise<GatewayCommand[]> {
    const rows = await tx
      .select(GatewayCommandsRepository.COLUMNS)
      .from(chargerCommands)
      .where(and(eq(chargerCommands.chargerId, chargerId), eq(chargerCommands.status, 'queued')))
      .orderBy(asc(chargerCommands.createdAt));
    return rows as GatewayCommand[];
  }

  /** Claims a queued command for sending. False when another path already took it. */
  async markSent(tx: Transaction, id: string): Promise<boolean> {
    const rows = await tx
      .update(chargerCommands)
      .set({ status: 'sent', sentAt: sql`now()` })
      .where(and(eq(chargerCommands.id, id), eq(chargerCommands.status, 'queued')))
      .returning({ id: chargerCommands.id });
    return rows.length === 1;
  }

  async complete(
    tx: Transaction,
    id: string,
    outcome: { status: CommandStatus; result: unknown; error: string | null },
  ): Promise<void> {
    await tx
      .update(chargerCommands)
      .set({ ...outcome, completedAt: sql`now()` })
      .where(eq(chargerCommands.id, id));
  }

  async expire(tx: Transaction, ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await tx
      .update(chargerCommands)
      .set({
        status: 'expired',
        error: 'The charger did not reconnect in time.',
        completedAt: sql`now()`,
      })
      .where(and(inArray(chargerCommands.id, ids), eq(chargerCommands.status, 'queued')));
  }
}
