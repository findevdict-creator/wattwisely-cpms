import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
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
  ) {}

  async describe(auth: RequestAuth): Promise<MeResponseDto> {
    const account = auth.account;
    if (!account) {
      return new MeResponseDto(auth, []);
    }
    const memberships = await this.transactionRunner.run(
      DatabaseSession.forUser(account.id),
      (tx) => this.tenantAccess.findActiveMemberships(tx, account.id),
    );
    return new MeResponseDto(
      auth,
      memberships.map((membership) => membership.tenant),
    );
  }

  describePermissions(access: TenantAccess): MyPermissionsDto {
    return new MyPermissionsDto(access);
  }
}
