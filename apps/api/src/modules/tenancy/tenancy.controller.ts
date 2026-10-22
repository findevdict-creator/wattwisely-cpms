import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { CurrentTenantDto } from './dto/current-tenant.dto';
import { TenancyService } from './tenancy.service';

/**
 * GET /v1/tenant - the first tenant-scoped endpoint.
 * It shows the full path every tenant endpoint takes: token check, then tenant check.
 */
@ApiTags('tenancy')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Tenant-Id',
  required: false,
  description: 'Needed when you belong to more than one tenant',
})
@Controller('tenant')
export class TenancyController {
  constructor(private readonly tenancyService: TenancyService) {}

  @Get()
  current(@CurrentAuth() auth: RequestAuth): CurrentTenantDto {
    // TenantContextGuard guarantees a tenant on every route not marked withoutTenant().
    return this.tenancyService.describe(auth.tenant as NonNullable<RequestAuth['tenant']>);
  }
}
