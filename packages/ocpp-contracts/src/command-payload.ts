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

/**
 * A power cap for the whole charger (module 17, load management): an OCPP 1.6
 * ChargePointMaxProfile on connector 0 with one period from now, in watts.
 */
export interface SetChargingProfilePayload {
  /** The profile's id on the charger; the platform uses one id per charger, so a new cap replaces the old. */
  profile_id: number;
  limit_w: number;
}

/** Takes the platform's cap off the charger again. */
export interface ClearChargingProfilePayload {
  profile_id: number;
}

export type CommandPayload =
  | RemoteStartPayload
  | RemoteStopPayload
  | ResetPayload
  | UnlockPayload
  | ChangeAvailabilityPayload
  | SetChargingProfilePayload
  | ClearChargingProfilePayload;
