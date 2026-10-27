import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { OcppVersion, RemoteStopPayload } from '@wattwisely/ocpp-contracts';
import { CommandOutcome } from '../../commands/command-outcome';
import { GatewayCommand } from '../../storage/gateway-commands.repository';
import { SessionsRepository } from '../../storage/sessions.repository';
import { CallReply } from '../../transport/call-reply';
import { CommandTranslator, OutgoingCall } from '../command-translator';
import { V201CommandBuilder } from './v201-command.builder';

/**
 * OCPP 2.0.1 commands. A remote stop names the transaction the way the station does, by
 * the id the station chose, so the translator looks that id up before building the CALL.
 */
@Injectable()
export class V201CommandTranslator implements CommandTranslator {
  readonly version: OcppVersion = '2.0.1';

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly sessions: SessionsRepository,
  ) {}

  async toCall(command: GatewayCommand): Promise<OutgoingCall> {
    if (command.action !== 'remote_stop') {
      return V201CommandBuilder.toCall(command);
    }
    const { session_id: sessionId } = command.payload as RemoteStopPayload;
    const ref = await this.transactionRunner.run(
      DatabaseSession.forTenant(command.tenantId),
      (tx) => this.sessions.transactionRefOf(tx, sessionId),
    );
    return V201CommandBuilder.toCall(command, ref);
  }

  toOutcome(reply: CallReply): CommandOutcome {
    return V201CommandBuilder.toOutcome(reply);
  }
}
