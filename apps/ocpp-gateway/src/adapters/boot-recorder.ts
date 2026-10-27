import { Injectable } from '@nestjs/common';
import { BootFingerprint, DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { ChargerConnection } from '../connection/charger-connection';
import { ChargerEventPublisher } from '../events/charger-event.publisher';
import { BootEventsRepository } from '../storage/boot-events.repository';
import { BootUpdate, GatewayChargersRepository } from '../storage/gateway-chargers.repository';
import { BootFingerprintVerifier, BootVerdict } from './boot-fingerprint.verifier';

/** What a charger says about itself at boot, in the platform's words whatever the OCPP version. */
export interface BootReport {
  vendor: string;
  model: string;
  chargePointSerial: string | null;
  chargeBoxSerial: string | null;
  firmwareVersion: string | null;
  iccid: string | null;
  imsi: string | null;
  meterType: string | null;
  meterSerial: string | null;
}

/**
 * One transaction per BootNotification, for every OCPP version: checks the fingerprint
 * against what is stored right now, updates the charger row (including the version the
 * connection speaks), appends the boot event and announces it.
 */
@Injectable()
export class BootRecorder {
  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly chargers: GatewayChargersRepository,
    private readonly bootEvents: BootEventsRepository,
    private readonly publisher: ChargerEventPublisher,
  ) {}

  record(
    connection: ChargerConnection,
    report: BootReport,
    heartbeatIntervalS: number,
  ): Promise<BootVerdict> {
    const charger = connection.charger;
    return this.transactionRunner.run(DatabaseSession.forTenant(charger.tenantId), async (tx) => {
      const stored = await this.chargers.findFingerprint(tx, charger.id);
      const verdict = BootFingerprintVerifier.verify(
        charger.authMode,
        stored,
        BootRecorder.fingerprintOf(report),
      );
      const boot: BootUpdate = {
        ...report,
        ocppVersion: connection.version,
        registrationStatus: verdict.status,
        heartbeatIntervalS,
        bootFingerprint: verdict.fingerprint,
      };
      await this.chargers.recordBoot(tx, charger.id, boot);
      await this.bootEvents.insert(tx, charger, boot, verdict.reason);
      await this.publisher.publish(tx, charger, 'charger.booted', {
        status: verdict.status,
        reason: verdict.reason,
      });
      return verdict;
    });
  }

  static fingerprintOf(report: BootReport): BootFingerprint {
    return {
      vendor: report.vendor,
      model: report.model,
      serial: report.chargePointSerial ?? report.chargeBoxSerial ?? null,
    };
  }
}
