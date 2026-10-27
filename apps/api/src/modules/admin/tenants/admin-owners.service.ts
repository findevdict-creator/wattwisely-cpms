import { Injectable } from '@nestjs/common';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { PlatformTransaction } from '../../../common/platform/platform-transaction';
import { RequestAuth } from '../../../common/request/request-auth';
import { AdminTenantDescriber } from './admin-tenant.describer';
import { InviteOwnerResultDto } from './dto/invite-owner-result.dto';
import { TenantOwnerDto } from './dto/tenant-owner.dto';
import { OwnerInviter } from './owner-inviter';

/** A tenant's Owners as the admin console sees them, and inviting another (story ADM-01). */
@Injectable()
export class AdminOwnersService {
  constructor(
    private readonly platform: PlatformTransaction,
    private readonly inviter: OwnerInviter,
    private readonly audit: AuditRecorder,
    private readonly describer: AdminTenantDescriber,
  ) {}

  list(auth: RequestAuth, tenantId: string): Promise<TenantOwnerDto[]> {
    return this.platform.runInTenant(auth, tenantId, async (tx) => {
      await this.describer.require(tx, tenantId);
      return this.describer.owners(tx);
    });
  }

  async invite(auth: RequestAuth, tenantId: string, email: string): Promise<InviteOwnerResultDto> {
    const invitation = await this.platform.runInTenant(auth, tenantId, async (tx) => {
      await this.describer.requireLive(tx, tenantId);
      const saved = await this.inviter.save(tx, auth, tenantId, email);
      await this.audit.record(
        tx,
        auth,
        {
          action: 'team.member_invited',
          targetType: 'member',
          targetId: saved.member.id,
          targetLabel: saved.member.email,
          after: { roles: ['Owner'], invitedBy: OwnerInviter.INVITER_NAME },
        },
        tenantId,
      );
      return saved;
    });
    const isSent = await this.inviter.sendEmail(tenantId, invitation);
    return new InviteOwnerResultDto(new TenantOwnerDto(invitation.member), isSent);
  }
}
