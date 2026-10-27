import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../../common/auth/route-access.decorator';
import { PlatformTransaction } from '../../../common/platform/platform-transaction';
import { CurrentAuth } from '../../../common/request/current-auth.decorator';
import { RequestAuth } from '../../../common/request/request-auth';
import { AdminOverviewRepository } from './admin-overview.repository';
import { AdminOverviewDto } from './dto/admin-overview.dto';

/** GET /v1/admin/overview: the counters on the admin console's start page. */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/overview')
export class AdminOverviewController {
  constructor(
    private readonly platform: PlatformTransaction,
    private readonly overview: AdminOverviewRepository,
  ) {}

  @Get()
  @RouteAccess.platform('tenants:read')
  async get(@CurrentAuth() auth: RequestAuth): Promise<AdminOverviewDto> {
    const counts = await this.platform.run(auth, (tx) => this.overview.count(tx));
    return new AdminOverviewDto(counts);
  }
}
