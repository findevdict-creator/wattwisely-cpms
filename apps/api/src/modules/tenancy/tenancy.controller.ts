import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { CurrentAuth } from '../../common/request/current-auth.decorator';
import { RequestAuth } from '../../common/request/request-auth';
import { CurrentTenantDto } from './dto/current-tenant.dto';
import { TenancyService } from './tenancy.service';

/**
 * GET /v1/tenant - the first tenant-scoped endpoint.
 * It shows the full path every tenant endpoint takes: token, tenant, then permission check.
 */
@ApiTags('tenancy')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Tenant-Id',
  required: false,
  description: 'Needed when you belong to more than one tenant',
})
@RouteAccess.anyMember()
@Controller('tenant')
export class TenancyController {
  constructor(private readonly tenancyService: TenancyService) {}

  @Get()
  current(@CurrentAuth() auth: RequestAuth): CurrentTenantDto {
    return this.tenancyService.describe(auth.requireAccess().tenant);
  }
}
