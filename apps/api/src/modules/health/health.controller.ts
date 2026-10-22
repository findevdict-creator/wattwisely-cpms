import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RouteAccess } from '../../common/auth/route-access.decorator';
import { ProblemException } from '../../common/problem/problem.exception';
import { HealthService } from './health.service';
import { HealthStatusDto } from './health-status.dto';

/** Health checks used by Docker, Caddy and deploy/scripts/health.sh. No login needed. */
@ApiTags('health')
@RouteAccess.public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  live(): HealthStatusDto {
    return this.healthService.live();
  }

  @Get('ready')
  async ready(): Promise<HealthStatusDto> {
    const status = await this.healthService.ready();
    if (status.status !== 'ok') {
      throw new ProblemException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'not_ready',
        'Keycloak or the database cannot be reached.',
      );
    }
    return status;
  }
}
