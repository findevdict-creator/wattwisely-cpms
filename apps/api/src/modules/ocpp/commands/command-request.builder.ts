import { Injectable } from '@nestjs/common';
import { Transaction, UuidV7 } from '@wattwisely/db';
import { CommandPayload, RemoteStartTag, StaffCommandAction } from '@wattwisely/ocpp-contracts';
import { ConnectorsRepository } from '../../assets/connectors/connectors.repository';
import { OcppErrors } from '../ocpp-errors';
import { ActiveSessionLookup } from './active-session.lookup';
import { ChangeAvailabilityRequestDto } from './dto/change-availability-request.dto';
import { RemoteStartRequestDto } from './dto/remote-start-request.dto';
import { RemoteStopRequestDto } from './dto/remote-stop-request.dto';
import { ResetRequestDto } from './dto/reset-request.dto';
import { UnlockRequestDto } from './dto/unlock-request.dto';

/** The request bodies the five command endpoints accept. */
export type CommandRequest =
  | RemoteStartRequestDto
  | RemoteStopRequestDto
  | ResetRequestDto
  | UnlockRequestDto
  | ChangeAvailabilityRequestDto;

/**
 * Turns a command's request body into the payload the gateway sends: connector ids
 * become the charger's own connector numbers, a session becomes its OCPP transaction id.
 * Anything that does not belong to the charger answers 422.
 */
@Injectable()
export class CommandRequestBuilder {
  constructor(
    private readonly connectors: ConnectorsRepository,
    private readonly sessions: ActiveSessionLookup,
  ) {}

  async build(
    tx: Transaction,
    chargerId: string,
    action: StaffCommandAction,
    body: CommandRequest,
  ): Promise<CommandPayload> {
    switch (action) {
      case 'remote_start':
        return {
          ocpp_connector_id: await this.numberOf(tx, chargerId, body as RemoteStartRequestDto),
          id_tag: RemoteStartTag.generate(),
        };
      case 'remote_stop':
        return this.remoteStop(tx, chargerId, body as RemoteStopRequestDto);
      case 'reset':
        return { type: (body as ResetRequestDto).type === 'hard' ? 'Hard' : 'Soft' };
      case 'unlock':
        return { ocpp_connector_id: await this.numberOf(tx, chargerId, body as UnlockRequestDto) };
      case 'change_availability':
        return this.changeAvailability(tx, chargerId, body as ChangeAvailabilityRequestDto);
    }
  }

  private numberOf(tx: Transaction, chargerId: string, body: { connector_id: string }) {
    return this.connectorNumber(tx, chargerId, body.connector_id);
  }

  private async remoteStop(tx: Transaction, chargerId: string, body: RemoteStopRequestDto) {
    const session = await this.sessions.find(tx, chargerId, body.session_id);
    if (!session) {
      throw OcppErrors.sessionNotActive();
    }
    return { ocpp_transaction_id: session.ocppTransactionId, session_id: session.id };
  }

  private async changeAvailability(
    tx: Transaction,
    chargerId: string,
    body: ChangeAvailabilityRequestDto,
  ) {
    return {
      ocpp_connector_id: body.connector_id
        ? await this.connectorNumber(tx, chargerId, body.connector_id)
        : 0,
      type: body.operative ? ('Operative' as const) : ('Inoperative' as const),
    };
  }

  /** The charger's own number for one of its connectors. */
  private async connectorNumber(tx: Transaction, chargerId: string, connectorId: string) {
    const connector = UuidV7.isUuid(connectorId)
      ? await this.connectors.findById(tx, connectorId)
      : null;
    if (!connector || connector.chargerId !== chargerId) {
      throw OcppErrors.connectorUnknown();
    }
    return connector.ocppConnectorId;
  }
}
