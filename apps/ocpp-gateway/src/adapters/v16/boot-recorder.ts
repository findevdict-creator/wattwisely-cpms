import { Injectable } from '@nestjs/common';
import { BootFingerprint, DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { ChargerConnection } from '../../connection/charger-connection';
import { ChargerEventPublisher } from '../../events/charger-event.publisher';
import { BootEventsRepository } from '../../storage/boot-events.repository';
import { BootUpdate, GatewayChargersRepository } from '../../storage/gateway-chargers.repository';
import { BootFingerprintVerifier, BootVerdict } from '../boot-fingerprint.verifier';
import { BootNotificationRequest } from './v16-messages';

/**
 * One transaction per BootNotification: checks the fingerprint against what is stored
 * right now, updates the charger row, appends the boot event and announces it.
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
    payload: BootNotificationRequest,
    heartbeatIntervalS: number,
  ): Promise<BootVerdict> {
    const charger = connection.charger;
    return this.transactionRunner.run(DatabaseSession.forTenant(charger.tenantId), async (tx) => {
      const stored = await this.chargers.findFingerprint(tx, charger.id);
      const verdict = BootFingerprintVerifier.verify(
        charger.authMode,
        stored,
        BootRecorder.fingerprintOf(payload),
      );
      const boot = BootRecorder.toUpdate(payload, verdict, heartbeatIntervalS);
      await this.chargers.recordBoot(tx, charger.id, boot);
      await this.bootEvents.insert(tx, charger, boot, verdict.reason);
      await this.publisher.publish(tx, charger, 'charger.booted', {
        status: verdict.status,
        reason: verdict.reason,
      });
      return verdict;
    });
  }

  static fingerprintOf(payload: BootNotificationRequest): BootFingerprint {
    return {
      vendor: payload.chargePointVendor,
      model: payload.chargePointModel,
      serial: payload.chargePointSerialNumber ?? payload.chargeBoxSerialNumber ?? null,
    };
  }

  private static toUpdate(
    payload: BootNotificationRequest,
    verdict: BootVerdict,
    heartbeatIntervalS: number,
  ): BootUpdate {
    return {
      vendor: payload.chargePointVendor,
      model: payload.chargePointModel,
      chargePointSerial: payload.chargePointSerialNumber ?? null,
      chargeBoxSerial: payload.chargeBoxSerialNumber ?? null,
      firmwareVersion: payload.firmwareVersion ?? null,
      iccid: payload.iccid ?? null,
      imsi: payload.imsi ?? null,
      meterType: payload.meterType ?? null,
      meterSerial: payload.meterSerialNumber ?? null,
      registrationStatus: verdict.status,
      heartbeatIntervalS,
      bootFingerprint: verdict.fingerprint,
    };
  }
}
