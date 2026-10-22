import { Injectable } from '@nestjs/common';
import { chargerBootEvents, Transaction, UuidV7 } from '@wattwisely/db';
import { BootUpdate } from './gateway-chargers.repository';

/** Appends to charger_boot_events: one row per BootNotification, accepted or not. */
@Injectable()
export class BootEventsRepository {
  async insert(
    tx: Transaction,
    charger: { id: string; tenantId: string },
    boot: BootUpdate,
    reason: string | null,
  ): Promise<void> {
    await tx.insert(chargerBootEvents).values({
      id: UuidV7.create(),
      tenantId: charger.tenantId,
      chargerId: charger.id,
      vendor: boot.vendor,
      model: boot.model,
      chargePointSerial: boot.chargePointSerial,
      chargeBoxSerial: boot.chargeBoxSerial,
      firmwareVersion: boot.firmwareVersion,
      iccid: boot.iccid,
      imsi: boot.imsi,
      meterType: boot.meterType,
      meterSerial: boot.meterSerial,
      responseStatus: boot.registrationStatus,
      reason,
    });
  }
}
