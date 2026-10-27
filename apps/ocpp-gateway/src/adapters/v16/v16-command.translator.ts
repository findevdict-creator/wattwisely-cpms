import { Injectable } from '@nestjs/common';
import { OcppVersion } from '@wattwisely/ocpp-contracts';
import { CommandOutcome } from '../../commands/command-outcome';
import { GatewayCommand } from '../../storage/gateway-commands.repository';
import { CallReply } from '../../transport/call-reply';
import { CommandTranslator, OutgoingCall } from '../command-translator';
import { V16CommandBuilder } from './v16-command.builder';

/** OCPP 1.6J commands need nothing but the command row: the builder does all the work. */
@Injectable()
export class V16CommandTranslator implements CommandTranslator {
  readonly version: OcppVersion = '1.6';

  toCall(command: GatewayCommand): Promise<OutgoingCall> {
    return Promise.resolve(V16CommandBuilder.toCall(command));
  }

  toOutcome(reply: CallReply): CommandOutcome {
    return V16CommandBuilder.toOutcome(reply);
  }
}
