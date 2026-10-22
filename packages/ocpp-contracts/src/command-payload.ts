/**
 * What each command carries in charger_commands.payload, in the platform's own words.
 * The gateway's version adapter turns it into the OCPP message for the charger.
 */
export interface RemoteStartPayload {
  ocpp_connector_id: number;
  /** The token the charger will start the transaction with; the platform makes it up. */
  id_tag: string;
}

export interface RemoteStopPayload {
  ocpp_transaction_id: number;
  session_id: string;
}

export interface ResetPayload {
  type: 'Soft' | 'Hard';
}

export interface UnlockPayload {
  ocpp_connector_id: number;
}

export interface ChangeAvailabilityPayload {
  /** 0 means the whole charger. */
  ocpp_connector_id: number;
  type: 'Operative' | 'Inoperative';
}

export type CommandPayload =
  RemoteStartPayload | RemoteStopPayload | ResetPayload | UnlockPayload | ChangeAvailabilityPayload;
