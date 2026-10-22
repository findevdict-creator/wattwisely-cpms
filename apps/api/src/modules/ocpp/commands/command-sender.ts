import { Injectable } from '@nestjs/common';
import { Transaction, UuidV7 } from '@wattwisely/db';
import { CommandAction, CommandCatalog } from '@wattwisely/ocpp-contracts';
import { RequestAuth } from '../../../common/request/request-auth';
import { AssetChangeRecorder } from '../../assets/asset-change.recorder';
import { ChargerRecord } from '../../assets/chargers/charger-record';
import { CommandNotifier } from './command-notifier';
import { CommandRecord } from './command-record';
import { CommandRequest, CommandRequestBuilder } from './command-request.builder';
import { CommandsRepository } from './commands.repository';

/**
 * Writes one command for a charger the caller may command: the row, the audit entry
 * and the notification to the gateway, all in the caller's transaction.
 */
@Injectable()
export class CommandSender {
  constructor(
    private readonly commands: CommandsRepository,
    private readonly requests: CommandRequestBuilder,
    private readonly notifier: CommandNotifier,
    private readonly changes: AssetChangeRecorder,
  ) {}

  async queue(
    tx: Transaction,
    auth: RequestAuth,
    charger: ChargerRecord,
    request: { action: CommandAction; body: CommandRequest },
  ): Promise<CommandRecord> {
    const account = auth.requireAccount();
    const tenantId = auth.requireAccess().tenant.id;
    const payload = await this.requests.build(tx, charger.id, request.action, request.body);
    const record = await this.commands.insert(tx, {
      id: UuidV7.create(),
      tenantId,
      chargerId: charger.id,
      action: request.action,
      payload,
      queuedUntil: new Date(Date.now() + CommandCatalog.QUEUE_MINUTES * 60_000),
      requestedBy: account.id,
      requestedByLabel: account.label,
    });
    await this.changes.record(tx, auth, 'chargers.command_sent', {
      target: { type: 'charger', id: charger.id, label: charger.ocppIdentity },
      after: { command_id: record.id, action: record.action, payload: record.payload },
    });
    await this.notifier.notify(tx, {
      command_id: record.id,
      charger_id: charger.id,
      tenant_id: tenantId,
    });
    return record;
  }
}
