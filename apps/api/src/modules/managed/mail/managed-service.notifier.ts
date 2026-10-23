import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { ManagedServiceMailer } from './managed-service.mailer';
import { OwnerContactsRepository } from './owner-contacts.repository';

/** An e-mail to send once the transaction that decided it has committed. */
export type PendingMail = () => Promise<void>;

/**
 * Reads the tenant's Owners inside the transaction and hands back the e-mail to send after
 * it commits, so no mail goes out for a change that was rolled back.
 */
@Injectable()
export class ManagedServiceNotifier {
  /** For a change nobody has to hear about. */
  static none(): PendingMail {
    return async () => undefined;
  }

  constructor(
    private readonly owners: OwnerContactsRepository,
    private readonly mailer: ManagedServiceMailer,
  ) {}

  async offered(tx: Transaction, tenantId: string, managerName: string): Promise<PendingMail> {
    const owners = await this.owners.findActiveOwners(tx);
    return () => this.mailer.offered(tenantId, owners, managerName);
  }

  async noticeGiven(tx: Transaction, tenantId: string, endsAt: Date): Promise<PendingMail> {
    const owners = await this.owners.findActiveOwners(tx);
    return () => this.mailer.noticeGiven(tenantId, owners, endsAt);
  }

  async tariffProposed(tx: Transaction, tenantId: string, proposal: { id: string; name: string }) {
    const owners = await this.owners.findActiveOwners(tx);
    return () => this.mailer.tariffProposed(tenantId, owners, proposal);
  }

  async tariffChanged(tx: Transaction, tenantId: string, tariff: { id: string; name: string }) {
    const owners = await this.owners.findActiveOwners(tx);
    return () => this.mailer.tariffChanged(tenantId, owners, tariff);
  }
}
