import { BootFingerprint } from '@wattwisely/db';
import { OcppVersion } from '@wattwisely/ocpp-contracts';

/** What the gateway needs to know about a charger to accept its connection and its boot. */
export interface ChargerIdentity {
  id: string;
  tenantId: string;
  /** As registered, in its own letter case. */
  identity: string;
  authMode: 'password' | 'none';
  passwordHash: string | null;
  allowPlainWs: boolean;
  /** The version it last spoke; what a charger that offers no subprotocol is taken at. */
  ocppVersion: OcppVersion | null;
  bootFingerprint: BootFingerprint | null;
  heartbeatIntervalS: number | null;
  /** From the last BootNotification; an accepted charger that reconnects need not boot again. */
  registrationStatus: 'accepted' | 'pending' | 'rejected' | null;
}
