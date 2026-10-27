import { SessionPaymentRule, SessionStartSource } from '@wattwisely/db';
import { SessionState } from '@wattwisely/session-engine';

/** One of the driver's own sessions, at any of their operators, with its payment when it has one (module 19). */
export interface DriverChargeRecord {
  id: string;
  tenantId: string;
  operatorName: string;
  driverId: string | null;
  status: SessionState;
  siteName: string;
  chargerIdentity: string;
  connectorId: string;
  connectorLabel: string;
  ocppConnectorId: number;
  ocppTransactionId: number | null;
  timeZone: string;
  startedAt: Date;
  endedAt: Date | null;
  energyWh: number;
  currency: string | null;
  grossAmount: number | null;
  pricedAt: Date | null;
  failureReason: string | null;
  isPaid: boolean;
  startSource: SessionStartSource | null;
  paymentRule: SessionPaymentRule | null;
  paymentStatus: string | null;
  holdAmount: number | null;
  capturedAmount: number | null;
  cardBrand: string | null;
  cardLast4: string | null;
  failureMessage: string | null;
}
