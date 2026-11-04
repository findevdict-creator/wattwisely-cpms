import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { StaffAccount } from '../../common/account/staff-account';
import { TenantAccessRepository } from '../../common/tenant/tenant-access.repository';
import { TenantSummary } from '../../common/tenant/tenant-summary';
import { PendingInvitationDto } from '../invitations/dto/pending-invitation.dto';
import { PendingInvitationsReader } from '../invitations/pending-invitations.reader';

/** The tenants a person belongs to and the invitations waiting for them, for GET /v1/me. */
export interface MyTenants {
  tenants: TenantSummary[];
  invitations: PendingInvitationDto[];
}

/** Reads both inside one transaction that shows the person their own memberships. */
@Injectable()
export class MyTenantsReader {
  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly tenantAccess: TenantAccessRepository,
    private readonly pending: PendingInvitationsReader,
  ) {}

  read(account: StaffAccount): Promise<MyTenants> {
    return this.transactionRunner.run(DatabaseSession.forUser(account.id), async (tx) => {
      const memberships = await this.tenantAccess.findActiveMemberships(tx, account.id);
      return {
        tenants: memberships.map((membership) => membership.tenant),
        invitations: await this.pending.listFor(tx, account),
      };
    });
  }
}
