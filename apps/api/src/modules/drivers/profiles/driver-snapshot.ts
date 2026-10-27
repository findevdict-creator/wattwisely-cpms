import { DriverRecord } from './driver-record';

/** The part of a driver worth keeping in the audit log's before and after. */
export class DriverSnapshot {
  static of(driver: DriverRecord | null): object | null {
    if (!driver) {
      return null;
    }
    return {
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      reference: driver.reference,
      notes: driver.notes,
      status: driver.status,
      block_reason: driver.blockReason,
      payment_mode: driver.paymentMode,
      account: DriverSnapshot.accountStatusOf(driver),
    };
  }

  /** none, invited or linked: what the driver's page shows about their login (module 19). */
  static accountStatusOf(driver: DriverRecord): 'none' | 'invited' | 'linked' {
    if (driver.driverAccountId) {
      return 'linked';
    }
    return driver.invitation ? 'invited' : 'none';
  }
}
