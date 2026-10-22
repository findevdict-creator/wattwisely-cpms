import { BootFingerprint } from '@wattwisely/db';

/** What the gateway needs to know about a charger to accept its connection and its boot. */
export interface ChargerIdentity {
  id: string;
  tenantId: string;
  /** As registered, in its own letter case. */
  identity: string;
  authMode: 'password' | 'none';
  passwordHash: string | null;
  allowPlainWs: boolean;
  ocppVersion: '1.6' | '2.0.1' | null;
  bootFingerprint: BootFingerprint | null;
  heartbeatIntervalS: number | null;
  /** From the last BootNotification; an accepted charger that reconnects need not boot again. */
  registrationStatus: 'accepted' | 'pending' | 'rejected' | null;
}
