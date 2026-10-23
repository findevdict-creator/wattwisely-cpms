import { Injectable } from '@nestjs/common';
import { DatabaseErrors } from '@wattwisely/db';
import { PlatformTransaction } from '../../../common/platform/platform-transaction';
import { RequestAuth } from '../../../common/request/request-auth';
import { AdminTenantDescriber } from './admin-tenant.describer';
import { AdminTenantErrors } from './admin-tenant-errors';
import { CreateTenantRequestDto } from './dto/create-tenant-request.dto';
import { CreateTenantResultDto } from './dto/create-tenant-result.dto';
import { OwnerInvitation, OwnerInviter } from './owner-inviter';
import { TenantCreator } from './tenant-creator';
import { TenantSlug } from './tenant-slug';

/**
 * Creating a tenant (story ADM-01): the company row, its plan and, when an e-mail address
 * is given, its first Owner's invitation, all in one transaction. The e-mail goes out after
 * the commit; if the mail server refuses, the invitation stays and can be resent.
 */
@Injectable()
export class TenantCreationService {
  constructor(
    private readonly platform: PlatformTransaction,
    private readonly creator: TenantCreator,
    private readonly inviter: OwnerInviter,
    private readonly describer: AdminTenantDescriber,
  ) {}

  async create(auth: RequestAuth, body: CreateTenantRequestDto): Promise<CreateTenantResultDto> {
    const slug = body.slug ?? TenantSlug.fromName(body.name);
    let tenantId = '';
    let invitation: OwnerInvitation | null = null;
    try {
      await this.platform.run(auth, async (tx) => {
        tenantId = await this.creator.save(tx, auth, body);
      });
      if (body.owner_email) {
        invitation = await this.platform.runInTenant(auth, tenantId, (tx) =>
          this.inviter.save(tx, auth, tenantId, body.owner_email as string),
        );
      }
    } catch (error) {
      if (DatabaseErrors.violatedUniqueConstraint(error) === 'tenants_slug_unique') {
        throw AdminTenantErrors.slugTaken(slug);
      }
      throw error;
    }
    const isSent = invitation ? await this.inviter.sendEmail(tenantId, invitation) : null;
    return new CreateTenantResultDto(await this.describer.describe(auth, tenantId), isSent);
  }
}
