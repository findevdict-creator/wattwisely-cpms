import { Injectable } from '@nestjs/common';
import { DatabaseErrors, drivers, Transaction, UuidV7 } from '@wattwisely/db';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverSnapshot } from '../../drivers/profiles/driver-snapshot';
import { DriversRepository } from '../../drivers/profiles/drivers.repository';
import { PublicCharger } from '../../payments/public/charge-place.lookup';
import { DriverAppErrors } from '../driver-app-errors';

/**
 * The record an operator gets of a driver who first charges at one of its public chargers
 * with their login (module 19, decision 6): made with the driver's consent, marked as a guest,
 * linked to the login from the start, and written to the operator's audit log. An operator
 * that already keeps a record with the same e-mail address must invite the driver instead,
 * so the two are never merged behind anyone's back.
 */
@Injectable()
export class GuestRecordWriter {
  static readonly EMAIL_INDEX = 'drivers_email_unique';

  constructor(
    private readonly drivers: DriversRepository,
    private readonly audit: AuditRecorder,
  ) {}

  /** Runs inside the operator's tenant. Returns the new record's id. */
  async create(tx: Transaction, auth: RequestAuth, charger: PublicCharger): Promise<string> {
    const account = auth.requireDriver();
    const id = UuidV7.create();
    const name = account.displayName || account.email;
    await this.insert(tx, {
      id,
      tenantId: charger.tenantId,
      name,
      email: account.email,
      driverAccountId: account.id,
      linkedAt: new Date(),
      isGuest: true,
    });
    await this.audit.record(
      tx,
      auth,
      {
        action: 'drivers.guest_record_created',
        targetType: 'driver',
        targetId: id,
        targetLabel: name,
        before: null,
        after: DriverSnapshot.of(await this.drivers.findById(tx, id)),
      },
      charger.tenantId,
    );
    return id;
  }

  private async insert(tx: Transaction, row: typeof drivers.$inferInsert): Promise<void> {
    try {
      await this.drivers.insert(tx, row);
    } catch (error) {
      if (DatabaseErrors.violatedUniqueConstraint(error) === GuestRecordWriter.EMAIL_INDEX) {
        throw DriverAppErrors.driverRecordExists();
      }
      throw error;
    }
  }
}
