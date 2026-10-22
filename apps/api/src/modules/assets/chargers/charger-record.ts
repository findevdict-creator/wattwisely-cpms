import { BootFingerprint } from '@wattwisely/db';
import { ConnectorRecord } from '../connectors/connector-record';
import { ChargerStatus } from './charger-status';

/** One chargers row with its derived status and site name, as the repository returns it. */
export interface ChargerRecord {
  id: string;
  siteId: string;
  siteName: string;
  ocppIdentity: string;
  vendor: string | null;
  model: string | null;
  authMode: 'password' | 'none';
  allowPlainWs: boolean;
  visibilityOverride: 'public' | 'private' | null;
  siteVisibility: 'public' | 'private';
  status: ChargerStatus;
  ocppVersion: '1.6' | '2.0.1' | null;
  chargePointSerial: string | null;
  chargeBoxSerial: string | null;
  firmwareVersion: string | null;
  bootFingerprint: BootFingerprint | null;
  registrationStatus: 'accepted' | 'pending' | 'rejected' | null;
  lastBootAt: Date | null;
  lastSeenAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A charger with its connectors, as the API shows it. */
export interface ChargerDetail extends ChargerRecord {
  connectors: ConnectorRecord[];
}
