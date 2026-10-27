import {
  ChangeAvailabilityPayload,
  ClearChargingProfilePayload,
  CommandCatalog,
  RemoteStartPayload,
  RemoteStopPayload,
  ResetPayload,
  SetChargingProfilePayload,
  UnlockPayload,
} from '@wattwisely/ocpp-contracts';
import { CommandOutcome } from '../../commands/command-outcome';
import { GatewayCommand } from '../../storage/gateway-commands.repository';
import { CallReply } from '../../transport/call-reply';
import { OutgoingCall } from '../command-translator';
import { V16ChargingProfile } from './v16-charging-profile';

/** Turns a platform command into its OCPP 1.6 CALL, and the charger's reply into an outcome. */
export class V16CommandBuilder {
  /** The reply statuses that mean the charger will do it ("Unknown" is ClearChargingProfile's "nothing to clear"). */
  static readonly ACCEPTED = ['Accepted', 'Scheduled', 'Unlocked', 'Unknown'];

  static toCall(command: GatewayCommand): OutgoingCall {
    return {
      action: CommandCatalog.OCPP16_ACTIONS[command.action],
      payload: V16CommandBuilder.toPayload(command),
    };
  }

  static toOutcome(reply: CallReply): CommandOutcome {
    switch (reply.kind) {
      case 'result':
        return V16CommandBuilder.fromResult(reply.payload);
      case 'error':
        return {
          status: 'failed',
          result: reply.details ?? null,
          error: `${reply.code}: ${reply.description}`,
        };
      case 'timeout':
        return { status: 'timed_out', result: null, error: 'The charger did not answer in time.' };
      case 'closed':
        return {
          status: 'failed',
          result: null,
          error: 'The charger disconnected before answering.',
        };
    }
  }

  private static fromResult(payload: unknown): CommandOutcome {
    const status = (payload as { status?: unknown })?.status;
    const isAccepted = typeof status === 'string' && V16CommandBuilder.ACCEPTED.includes(status);
    return {
      status: isAccepted ? 'accepted' : 'rejected',
      result: payload,
      error: isAccepted ? null : `The charger answered ${String(status ?? 'nothing')}.`,
    };
  }

  private static toPayload(command: GatewayCommand): unknown {
    switch (command.action) {
      case 'remote_start': {
        const start = command.payload as RemoteStartPayload;
        return { connectorId: start.ocpp_connector_id, idTag: start.id_tag };
      }
      case 'remote_stop':
        return { transactionId: (command.payload as RemoteStopPayload).ocpp_transaction_id };
      case 'reset':
        return { type: (command.payload as ResetPayload).type };
      case 'unlock':
        return { connectorId: (command.payload as UnlockPayload).ocpp_connector_id };
      case 'change_availability': {
        const change = command.payload as ChangeAvailabilityPayload;
        return { connectorId: change.ocpp_connector_id, type: change.type };
      }
      case 'set_charging_profile':
        return V16ChargingProfile.set(command.payload as SetChargingProfilePayload);
      case 'clear_charging_profile':
        return V16ChargingProfile.clear(command.payload as ClearChargingProfilePayload);
    }
  }
}
