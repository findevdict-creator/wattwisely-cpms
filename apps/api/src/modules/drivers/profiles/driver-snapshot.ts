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
    };
  }
}
