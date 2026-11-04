import { Injectable } from '@nestjs/common';
import { PlatformAccessResolver } from '../../common/platform/platform-access.resolver';
import { RequestAuth } from '../../common/request/request-auth';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { ManagedServiceLookup } from '../managed/managed-service.lookup';
import { MeResponseDto } from './dto/me-response.dto';
import { MyPermissionsDto } from './dto/my-permissions.dto';
import { MyTenantsReader } from './my-tenants.reader';

/**
 * Describes the logged-in person: their tenants, the invitations waiting for them, and what
 * they may do in the current tenant.
 */
@Injectable()
export class MeService {
  constructor(
    private readonly myTenants: MyTenantsReader,
    private readonly platformAccess: PlatformAccessResolver,
    private readonly managed: ManagedServiceLookup,
  ) {}

  async describe(auth: RequestAuth): Promise<MeResponseDto> {
    const account = auth.account;
    if (!account) {
      return new MeResponseDto(auth, { tenants: [], invitations: [], platform: null });
    }
    return new MeResponseDto(auth, {
      ...(await this.myTenants.read(account)),
      platform: await this.platformAccess.resolve(account),
    });
  }

  async describePermissions(access: TenantAccess): Promise<MyPermissionsDto> {
    return new MyPermissionsDto(access, await this.managed.summaryFor(access));
  }
}
