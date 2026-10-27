import { OcppVersion } from '@wattwisely/ocpp-contracts';
import { CommandOutcome } from '../commands/command-outcome';
import { GatewayCommand } from '../storage/gateway-commands.repository';
import { CallReply } from '../transport/call-reply';

/** An OCPP CALL the gateway sends: the action name and payload in the charger's version. */
export interface OutgoingCall {
  action: string;
  payload: unknown;
}

/**
 * The outbound half of one OCPP version: how a platform command becomes a CALL in that
 * version and how the charger's reply becomes an outcome. It is kept apart from the
 * version's OcppAdapter (the inbound half) because the command path and the handlers
 * depend on each other: a boot's follow-up commands go through the sender, and the
 * sender must not need the handlers to exist first.
 */
export interface CommandTranslator {
  readonly version: OcppVersion;
  toCall(command: GatewayCommand): Promise<OutgoingCall>;
  toOutcome(reply: CallReply): CommandOutcome;
}
