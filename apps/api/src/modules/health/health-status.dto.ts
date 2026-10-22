import { ApiProperty } from '@nestjs/swagger';

/** Body of GET /health/live and GET /health/ready. */
export class HealthStatusDto {
  @ApiProperty({ enum: ['ok', 'unavailable'] })
  readonly status: 'ok' | 'unavailable';

  @ApiProperty({ example: { keycloak: 'ok' } })
  readonly checks: Record<string, 'ok' | 'unavailable'>;

  constructor(checks: Record<string, 'ok' | 'unavailable'>) {
    this.checks = checks;
    this.status = Object.values(checks).every((check) => check === 'ok') ? 'ok' : 'unavailable';
  }
}
