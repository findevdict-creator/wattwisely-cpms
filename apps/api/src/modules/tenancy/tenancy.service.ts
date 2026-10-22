import { Injectable } from '@nestjs/common';
import { TenantMembership } from '../../common/tenant/tenant-membership';
import { CurrentTenantDto } from './dto/current-tenant.dto';

/** Tenant details. Module 2 reads name, status and settings from the tenants table. */
@Injectable()
export class TenancyService {
  describe(tenant: TenantMembership): CurrentTenantDto {
    return new CurrentTenantDto(tenant);
  }
}
