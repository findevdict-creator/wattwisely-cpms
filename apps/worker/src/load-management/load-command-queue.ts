import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { chargerCommands, Transaction, UuidV7 } from '@wattwisely/db';
import { LoadProfile } from '@wattwisely/load-management';
import {
  CommandAction,
  CommandCatalog,
  CommandNotification,
  CommandPayload,
  NotifyChannels,
} from '@wattwisely/ocpp-contracts';

/** Where a command goes. */
export interface CommandTarget {
  tenantId: string;
  chargerId: string;
}

/**
 * Queues load management's commands the way the API queues a staff member's (module 4): a
 * charger_commands row and a NOTIFY to the gateway. They carry no requester, only the label
 * staff see in the command log.
 */
@Injectable()
export class LoadCommandQueue {
  static readonly REQUESTED_BY = 'Load management';

  /** SetChargingProfile with the platform's one profile at this many watts; returns the command id. */
  setCap(tx: Transaction, target: CommandTarget, limitW: number): Promise<string> {
    return this.queue(tx, target, 'set_charging_profile', {
      profile_id: LoadProfile.PROFILE_ID,
      limit_w: limitW,
    });
  }

  /** ClearChargingProfile for the platform's profile. */
  clearCap(tx: Transaction, target: CommandTarget): Promise<string> {
    return this.queue(tx, target, 'clear_charging_profile', {
      profile_id: LoadProfile.PROFILE_ID,
    });
  }

  private async queue(
    tx: Transaction,
    target: CommandTarget,
    action: CommandAction,
    payload: CommandPayload,
  ): Promise<string> {
    const id = UuidV7.create();
    await tx.insert(chargerCommands).values({
      id,
      tenantId: target.tenantId,
      chargerId: target.chargerId,
      action,
      payload,
      queuedUntil: new Date(Date.now() + CommandCatalog.QUEUE_MINUTES * 60_000),
      requestedBy: null,
      requestedByLabel: LoadCommandQueue.REQUESTED_BY,
    });
    const notification: CommandNotification = {
      command_id: id,
      charger_id: target.chargerId,
      tenant_id: target.tenantId,
    };
    await tx.execute(
      sql`select pg_notify(${NotifyChannels.COMMANDS}, ${JSON.stringify(notification)})`,
    );
    return id;
  }
}
