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
import { V201ChargingProfile } from './v201-charging-profile';

/**
 * Turns a platform command into its OCPP 2.0.1 CALL, and the charger's reply into an
 * outcome. The platform's connector number is the EVSE id; a remote stop names the
 * transaction by the id the charger chose, which the adapter looks up first.
 */
export class V201CommandBuilder {
  /** The reply statuses that mean the charger will do it ("Unknown" is ClearChargingProfile's "nothing to clear"). */
  static readonly ACCEPTED = ['Accepted', 'Scheduled', 'Unlocked', 'Unknown'];
  /** The platform's token type: it was authorised centrally, the charger need not ask again. */
  static readonly TOKEN_TYPE = 'Central';
  /** A 1.6 soft reset lets the charge finish; 2.0.1 says that as OnIdle. A hard one is Immediate. */
  static readonly RESET_TYPES: Record<ResetPayload['type'], string> = {
    Soft: 'OnIdle',
    Hard: 'Immediate',
  };
  /** The cable to unlock on an EVSE: the platform knows plugs, not cables, so the first. */
  static readonly FIRST_CABLE = 1;

  static toCall(command: GatewayCommand, transactionRef: string | null = null): OutgoingCall {
    return {
      action: CommandCatalog.OCPP201_ACTIONS[command.action],
      payload: V201CommandBuilder.toPayload(command, transactionRef),
    };
  }

  static toOutcome(reply: CallReply): CommandOutcome {
    switch (reply.kind) {
      case 'result':
        return V201CommandBuilder.fromResult(reply.payload);
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

  /** RequestStartTransaction wants an integer to echo back; the command's id gives a stable one. */
  static remoteStartIdOf(commandId: string): number {
    return parseInt(commandId.replace(/-/g, '').slice(0, 7), 16) || 1;
  }

  private static fromResult(payload: unknown): CommandOutcome {
    const status = (payload as { status?: unknown })?.status;
    const isAccepted = typeof status === 'string' && V201CommandBuilder.ACCEPTED.includes(status);
    return {
      status: isAccepted ? 'accepted' : 'rejected',
      result: payload,
      error: isAccepted ? null : `The charger answered ${String(status ?? 'nothing')}.`,
    };
  }

  private static toPayload(command: GatewayCommand, transactionRef: string | null): unknown {
    switch (command.action) {
      case 'remote_start':
        return V201CommandBuilder.remoteStart(command.id, command.payload as RemoteStartPayload);
      case 'remote_stop':
        return {
          transactionId:
            transactionRef ?? String((command.payload as RemoteStopPayload).ocpp_transaction_id),
        };
      case 'reset':
        return { type: V201CommandBuilder.RESET_TYPES[(command.payload as ResetPayload).type] };
      case 'unlock':
        return {
          evseId: (command.payload as UnlockPayload).ocpp_connector_id,
          connectorId: V201CommandBuilder.FIRST_CABLE,
        };
      case 'change_availability':
        return V201CommandBuilder.changeAvailability(command.payload as ChangeAvailabilityPayload);
      case 'set_charging_profile':
        return V201ChargingProfile.set(command.payload as SetChargingProfilePayload);
      case 'clear_charging_profile':
        return V201ChargingProfile.clear(command.payload as ClearChargingProfilePayload);
    }
  }

  private static remoteStart(commandId: string, start: RemoteStartPayload): object {
    return {
      evseId: start.ocpp_connector_id,
      remoteStartId: V201CommandBuilder.remoteStartIdOf(commandId),
      idToken: { idToken: start.id_tag, type: V201CommandBuilder.TOKEN_TYPE },
    };
  }

  /** Connector 0 is the whole station: no evse field at all. */
  private static changeAvailability(change: ChangeAvailabilityPayload): object {
    return {
      operationalStatus: change.type,
      ...(change.ocpp_connector_id > 0 ? { evse: { id: change.ocpp_connector_id } } : {}),
    };
  }
}
