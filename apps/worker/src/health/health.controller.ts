import { Controller, Get, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseClient } from '@wattwisely/db';
import { HealthStatus } from './health-status';

/** Health checks used by Docker and deploy/scripts/health.sh. No login needed. */
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseClient) {}

  @Get('live')
  live(): HealthStatus {
    return new HealthStatus({});
  }

  @Get('ready')
  async ready(): Promise<HealthStatus> {
    const status = new HealthStatus({
      database: (await this.database.isReachable()) ? 'ok' : 'unavailable',
    });
    if (status.status !== 'ok') {
      throw new ServiceUnavailableException({
        status: HttpStatus.SERVICE_UNAVAILABLE,
        code: 'not_ready',
        detail: 'The database cannot be reached.',
      });
    }
    return status;
  }
}
