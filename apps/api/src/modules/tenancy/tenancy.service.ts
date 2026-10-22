import { Injectable } from '@nestjs/common';
import { TenantSummary } from '../../common/tenant/tenant-summary';
import { CurrentTenantDto } from './dto/current-tenant.dto';

/** Tenant details, as loaded from the tenants table by TenantContextGuard. */
@Injectable()
export class TenancyService {
  describe(tenant: TenantSummary): CurrentTenantDto {
    return new CurrentTenantDto(tenant);
  }
}
