import { StoredTariffBand } from '@wattwisely/db';

/** The idle fee part of a session's tariff version. */
export interface WatchedTariff {
  idleGraceMinutes: number;
  /** Minor units; null for no cap. */
  idleFeeCap: number | null;
  bands: StoredTariffBand[];
}

/** What the driver e-mails need to know about one session a driver subscribed to. */
export interface WatchedSession {
  sessionId: string;
  email: string;
  wantsStarted: boolean;
  wantsNearlyFull: boolean;
  wantsFinished: boolean;
  wantsIdleWarning: boolean;
  status: string;
  siteName: string;
  chargerIdentity: string;
  connectorLabel: string;
  timeZone: string;
  startedAt: Date;
  endedAt: Date | null;
  unpluggedAt: Date | null;
  energyWh: number;
  currency: string | null;
  grossAmount: number | null;
  taxAmount: number | null;
  isPaid: boolean;
  paymentStatus: string | null;
  capturedAmount: number | null;
  /** The last state of charge the car reported, if it reports one. */
  socPercent: number | null;
  /** When energy stopped flowing: the first move to idle or stopping. */
  finishedAt: Date | null;
  tariff: WatchedTariff | null;
  /** The kinds already in the outbox for this session. */
  sentKinds: string[];
}
