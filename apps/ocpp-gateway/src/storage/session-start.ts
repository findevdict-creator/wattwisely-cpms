import { SessionPaymentRule, SessionStartSource } from '@wattwisely/db';

/** What StartTransaction records. */
export interface SessionStart {
  tenantId: string;
  chargerId: string;
  connectorId: string;
  idTag: string;
  /** The driver and card behind the tag, when it was a registered RFID card (module 13). */
  driverId?: string | null;
  rfidCardId?: string | null;
  /** How it was started and who pays (module 19); a paid card start gets its hold from the worker. */
  startSource?: SessionStartSource | null;
  paymentRule?: SessionPaymentRule | null;
  isPaid?: boolean;
  startedAt: Date;
  /** Null when the charger's first event carried no reading (2.0.1); set from the first that does. */
  meterStartWh: number | null;
  commandId: string | null;
  /** The transaction id a 2.0.1 charger chose (module 18); left out on 1.6. */
  ocppTransactionRef?: string | null;
}

/** Who a 2.0.1 transaction turned out to be for, when the token arrives after the start. */
export interface SessionIdentity {
  idTag: string;
  driverId: string | null;
  rfidCardId: string | null;
  commandId: string | null;
  startSource: SessionStartSource | null;
  paymentRule: SessionPaymentRule | null;
  isPaid: boolean;
}

/** What StopTransaction records. */
export interface SessionStop {
  endedAt: Date;
  meterStopWh: number;
  stopReason: string | null;
}
