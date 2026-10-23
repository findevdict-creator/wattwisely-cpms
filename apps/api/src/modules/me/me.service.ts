import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { PlatformAccessResolver } from '../../common/platform/platform-access.resolver';
import { RequestAuth } from '../../common/request/request-auth';
import { TenantAccessRepository } from '../../common/tenant/tenant-access.repository';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { MeResponseDto } from './dto/me-response.dto';
import { MyPermissionsDto } from './dto/my-permissions.dto';

/** Describes the logged-in person: their tenants, and what they may do in the current one. */
@Injectable()
export class MeService {
  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly tenantAccess: TenantAccessRepository,
    private readonly platformAccess: PlatformAccessResolver,
  ) {}

  async describe(auth: RequestAuth): Promise<MeResponseDto> {
    const account = auth.account;
    if (!account) {
      return new MeResponseDto(auth, [], null);
    }
    const memberships = await this.transactionRunner.run(
      DatabaseSession.forUser(account.id),
      (tx) => this.tenantAccess.findActiveMemberships(tx, account.id),
    );
    return new MeResponseDto(
      auth,
      memberships.map((membership) => membership.tenant),
      await this.platformAccess.resolve(account),
    );
  }

  describePermissions(access: TenantAccess): MyPermissionsDto {
    return new MyPermissionsDto(access);
  }
}
