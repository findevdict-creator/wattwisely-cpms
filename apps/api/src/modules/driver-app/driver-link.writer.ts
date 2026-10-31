import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { AuditRecorder } from '../../common/audit/audit.recorder';
import { RequestAuth } from '../../common/request/request-auth';
import { DriverSnapshot } from '../drivers/profiles/driver-snapshot';
import { DriverRecord } from '../drivers/profiles/driver-record';
import { DriversRepository } from '../drivers/profiles/drivers.repository';

/** A change to the link between a drivers row and the logged-in driver's account. */
export interface DriverLinkChange {
  tenantId: string;
  driverId: string;
  driverName: string;
  action: 'invitation_accepted' | 'invitation_declined' | 'unlinked' | 'guest_record_erased';
  /** The account to link (accepting), null to unlink (leaving), or left out when nothing changes (declining). */
  accountId?: string | null;
}

/**
 * Writes the driver's side of a link (module 19) inside the operator's tenant: sets the drivers
 * row's account and records the change in the operator's audit log, with the driver as actor.
 */
@Injectable()
export class DriverLinkWriter {
  constructor(
    private readonly drivers: DriversRepository,
    private readonly audit: AuditRecorder,
  ) {}

  async apply(tx: Transaction, auth: RequestAuth, change: DriverLinkChange): Promise<void> {
    const before = await this.drivers.findById(tx, change.driverId);
    if (change.accountId !== undefined) {
      await this.drivers.setAccount(tx, change.driverId, change.accountId);
    }
    await this.record(tx, auth, change, before);
  }

  /**
   * The driver deleted their account (module 33): a guest record the app made is blanked, and
   * a record the operator made is only unlinked, as when the driver leaves the operator. The
   * audit entry of an erased record keeps no copy of what was erased.
   */
  async erase(tx: Transaction, auth: RequestAuth, change: DriverLinkChange): Promise<void> {
    if (await this.drivers.eraseGuest(tx, change.driverId)) {
      const erased = { ...change, driverName: DriversRepository.ERASED_NAME };
      await this.record(tx, auth, { ...erased, action: 'guest_record_erased' }, null);
      return;
    }
    await this.apply(tx, auth, { ...change, action: 'unlinked', accountId: null });
  }

  private async record(
    tx: Transaction,
    auth: RequestAuth,
    change: DriverLinkChange,
    before: DriverRecord | null,
  ): Promise<void> {
    const after = await this.drivers.findById(tx, change.driverId);
    await this.audit.record(
      tx,
      auth,
      {
        action: `drivers.${change.action}`,
        targetType: 'driver',
        targetId: change.driverId,
        targetLabel: change.driverName,
        before: DriverSnapshot.of(before),
        after: DriverSnapshot.of(after),
      },
      change.tenantId,
    );
  }
}
