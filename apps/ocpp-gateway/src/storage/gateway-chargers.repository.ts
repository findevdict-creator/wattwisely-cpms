import { Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { BootFingerprint, chargers, Transaction } from '@wattwisely/db';
import { OcppVersion } from '@wattwisely/ocpp-contracts';
import { ChargerIdentity } from './charger-identity';

/** What a BootNotification updates on the charger row. */
export interface BootUpdate {
  vendor: string;
  model: string;
  chargePointSerial: string | null;
  chargeBoxSerial: string | null;
  firmwareVersion: string | null;
  iccid: string | null;
  imsi: string | null;
  meterType: string | null;
  meterSerial: string | null;
  /** The version the connection that booted speaks; a charger upgraded in the field moves with it. */
  ocppVersion: OcppVersion;
  registrationStatus: 'accepted' | 'pending' | 'rejected';
  heartbeatIntervalS: number;
  /** Stored only on the first accepted boot of a no-password charger. */
  bootFingerprint: BootFingerprint | null;
}

/** The gateway's reads and writes on the chargers table. */
@Injectable()
export class GatewayChargersRepository {
  /** Run under DatabaseSession.forChargerIdentity: the identity lookup policy shows just this row. */
  async findByIdentity(tx: Transaction, identity: string): Promise<ChargerIdentity | null> {
    const rows = await tx
      .select({
        id: chargers.id,
        tenantId: chargers.tenantId,
        identity: chargers.ocppIdentity,
        authMode: chargers.authMode,
        passwordHash: chargers.passwordHash,
        allowPlainWs: chargers.allowPlainWs,
        ocppVersion: chargers.ocppVersion,
        bootFingerprint: chargers.bootFingerprint,
        heartbeatIntervalS: chargers.heartbeatIntervalS,
        registrationStatus: chargers.registrationStatus,
      })
      .from(chargers)
      .where(
        and(
          eq(sql`lower(${chargers.ocppIdentity})`, identity.toLowerCase()),
          isNull(chargers.deletedAt),
        ),
      );
    return rows[0] ?? null;
  }

  /** The stored fingerprint right now (it may have been reset in the portal since the socket opened). */
  async findFingerprint(tx: Transaction, chargerId: string): Promise<BootFingerprint | null> {
    const rows = await tx
      .select({ bootFingerprint: chargers.bootFingerprint })
      .from(chargers)
      .where(eq(chargers.id, chargerId));
    return rows[0]?.bootFingerprint ?? null;
  }

  async recordBoot(tx: Transaction, chargerId: string, boot: BootUpdate): Promise<void> {
    await tx
      .update(chargers)
      .set({
        ocppVersion: boot.ocppVersion,
        vendor: sql`coalesce(${chargers.vendor}, ${boot.vendor})`,
        model: sql`coalesce(${chargers.model}, ${boot.model})`,
        chargePointSerial: boot.chargePointSerial,
        chargeBoxSerial: boot.chargeBoxSerial,
        firmwareVersion: boot.firmwareVersion,
        iccid: boot.iccid,
        imsi: boot.imsi,
        meterType: boot.meterType,
        meterSerial: boot.meterSerial,
        registrationStatus: boot.registrationStatus,
        heartbeatIntervalS: boot.heartbeatIntervalS,
        bootFingerprint: boot.bootFingerprint ?? undefined,
        lastBootAt: sql`now()`,
        lastHeartbeatAt: sql`now()`,
        lastSeenAt: sql`now()`,
      })
      .where(eq(chargers.id, chargerId));
  }

  /** Any message counts as a sign of life; a Heartbeat also moves last_heartbeat_at. */
  async touch(tx: Transaction, chargerId: string, isHeartbeat = false): Promise<void> {
    await tx
      .update(chargers)
      .set({
        lastSeenAt: sql`now()`,
        ...(isHeartbeat ? { lastHeartbeatAt: sql`now()` } : {}),
      })
      .where(eq(chargers.id, chargerId));
  }
}
