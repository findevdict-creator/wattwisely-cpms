import { SampledValue } from '@wattwisely/db';

/** The OCPP 1.6 request payloads the handlers read, after schema validation. */
export interface BootNotificationRequest {
  chargePointVendor: string;
  chargePointModel: string;
  chargePointSerialNumber?: string;
  chargeBoxSerialNumber?: string;
  firmwareVersion?: string;
  iccid?: string;
  imsi?: string;
  meterType?: string;
  meterSerialNumber?: string;
}

export interface StatusNotificationRequest {
  connectorId: number;
  errorCode: string;
  info?: string;
  status: string;
  timestamp?: string;
  vendorId?: string;
  vendorErrorCode?: string;
}

export interface AuthorizeRequest {
  idTag: string;
}

export interface StartTransactionRequest {
  connectorId: number;
  idTag: string;
  meterStart: number;
  reservationId?: number;
  timestamp: string;
}

export interface MeterValue {
  timestamp: string;
  sampledValue: SampledValue[];
}

export interface StopTransactionRequest {
  idTag?: string;
  meterStop: number;
  timestamp: string;
  transactionId: number;
  reason?: string;
  transactionData?: MeterValue[];
}

export interface MeterValuesRequest {
  connectorId: number;
  transactionId?: number;
  meterValue: MeterValue[];
}

export type IdTagStatus = 'Accepted' | 'Blocked' | 'Expired' | 'Invalid' | 'ConcurrentTx';
