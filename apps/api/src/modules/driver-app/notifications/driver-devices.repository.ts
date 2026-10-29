import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { driverDevices, Transaction, UuidV7 } from '@wattwisely/db';

/** A phone's platform and push token. */
export interface DeviceRegistration {
  platform: 'android' | 'ios';
  token: string;
}

/** Reads and writes driver_devices, the phones a driver is signed in on (module 34). */
@Injectable()
export class DriverDevicesRepository {
  /** The token moves to this account if someone else had it, and works again if it was refused. */
  async register(tx: Transaction, accountId: string, device: DeviceRegistration): Promise<void> {
    await tx
      .insert(driverDevices)
      .values({ id: UuidV7.create(), driverAccountId: accountId, ...device })
      .onConflictDoUpdate({
        target: driverDevices.token,
        set: {
          driverAccountId: accountId,
          platform: device.platform,
          invalidAt: null,
          updatedAt: new Date(),
        },
      });
  }

  async remove(tx: Transaction, accountId: string, token: string): Promise<void> {
    await tx
      .delete(driverDevices)
      .where(and(eq(driverDevices.driverAccountId, accountId), eq(driverDevices.token, token)));
  }

  async removeAll(tx: Transaction, accountId: string): Promise<void> {
    await tx.delete(driverDevices).where(eq(driverDevices.driverAccountId, accountId));
  }

  async count(tx: Transaction, accountId: string): Promise<number> {
    const rows = await tx
      .select({ id: driverDevices.id })
      .from(driverDevices)
      .where(eq(driverDevices.driverAccountId, accountId));
    return rows.length;
  }
}
