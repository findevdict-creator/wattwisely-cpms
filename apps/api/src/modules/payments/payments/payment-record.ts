import { PaymentStatus } from '@wattwisely/payments';

/** One payments row with where its session happened, as lists and details read it. */
export interface PaymentRecord {
  id: string;
  sessionId: string;
  type: 'preauth' | 'prepay' | 'postpay';
  status: PaymentStatus;
  currency: string;
  holdAmount: number;
  authorizedAmount: number | null;
  capturedAmount: number | null;
  refundedAmount: number;
  provider: string;
  providerPaymentId: string;
  cardBrand: string | null;
  cardLast4: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  captureAttempts: number;
  authorizedAt: Date | null;
  capturedAt: Date | null;
  releasedAt: Date | null;
  failedAt: Date | null;
  reviewFlags: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
  siteId: string;
  siteName: string;
  chargerId: string;
  chargerIdentity: string;
  connectorLabel: string;
  sessionStatus: string;
  sessionStartedAt: Date;
  sessionGrossAmount: number | null;
  energyWh: number;
}
