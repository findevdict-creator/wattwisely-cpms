import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { CommandOutcome } from '../adapters/v16/v16-command.builder';
import { ChargerEventPublisher } from '../events/charger-event.publisher';
import { ChargerIdentity } from '../storage/charger-identity';
import { GatewayCommand, GatewayCommandsRepository } from '../storage/gateway-commands.repository';

/** The gateway's view of charger_commands, each step in its own tenant transaction. */
@Injectable()
export class CommandStore {
  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly commands: GatewayCommandsRepository,
    private readonly publisher: ChargerEventPublisher,
  ) {}

  load(tenantId: string, commandId: string): Promise<GatewayCommand | null> {
    return this.transactionRunner.run(DatabaseSession.forTenant(tenantId), (tx) =>
      this.commands.findById(tx, commandId),
    );
  }

  /** Marks the command sent. False when it was no longer queued (already taken, or expired). */
  claim(command: GatewayCommand): Promise<boolean> {
    return this.transactionRunner.run(DatabaseSession.forTenant(command.tenantId), (tx) =>
      this.commands.markSent(tx, command.id),
    );
  }

  /** Records the outcome and tells the live streams about it. */
  complete(
    charger: ChargerIdentity,
    command: GatewayCommand,
    outcome: CommandOutcome,
  ): Promise<void> {
    return this.transactionRunner.run(DatabaseSession.forTenant(command.tenantId), async (tx) => {
      await this.commands.complete(tx, command.id, outcome);
      await this.publisher.publish(tx, charger, 'command.result', {
        command_id: command.id,
        action: command.action,
        status: outcome.status,
        error: outcome.error,
      });
    });
  }

  /** Expires the queued commands whose time ran out and returns the rest, oldest first. */
  takeQueued(charger: ChargerIdentity, now = new Date()): Promise<GatewayCommand[]> {
    return this.transactionRunner.run(DatabaseSession.forTenant(charger.tenantId), async (tx) => {
      const queued = await this.commands.findQueued(tx, charger.id);
      const stale = queued.filter((command) => command.queuedUntil < now);
      await this.commands.expire(
        tx,
        stale.map((command) => command.id),
      );
      return queued.filter((command) => command.queuedUntil >= now);
    });
  }
}
