/** The OCPP 2.0.1 request payloads the handlers read, after schema validation (part 2, section 1). */
export interface IdToken {
  idToken: string;
  type: string;
}

export interface BootNotificationRequest201 {
  reason: string;
  chargingStation: {
    model: string;
    vendorName: string;
    serialNumber?: string;
    firmwareVersion?: string;
    modem?: { iccid?: string; imsi?: string };
  };
}

export interface StatusNotificationRequest201 {
  timestamp: string;
  connectorStatus: string;
  evseId: number;
  connectorId: number;
}

export interface AuthorizeRequest201 {
  idToken: IdToken;
}

export interface SampledValue201 {
  value: number;
  context?: string;
  measurand?: string;
  phase?: string;
  location?: string;
  unitOfMeasure?: { unit?: string; multiplier?: number };
}

export interface MeterValue201 {
  timestamp: string;
  sampledValue: SampledValue201[];
}

export interface MeterValuesRequest201 {
  evseId: number;
  meterValue: MeterValue201[];
}

export type TransactionEventType = 'Started' | 'Updated' | 'Ended';

/** The verdicts the tag policy gives; 2.0.1's IdTokenInfo.status has these same words. */
export type IdTokenStatus = 'Accepted' | 'Blocked' | 'Expired' | 'Invalid' | 'ConcurrentTx';

export interface TransactionEventRequest201 {
  eventType: TransactionEventType;
  timestamp: string;
  triggerReason: string;
  seqNo: number;
  offline?: boolean;
  transactionInfo: {
    transactionId: string;
    chargingState?: string;
    stoppedReason?: string;
    remoteStartId?: number;
  };
  evse?: { id: number; connectorId?: number };
  idToken?: IdToken;
  meterValue?: MeterValue201[];
}
