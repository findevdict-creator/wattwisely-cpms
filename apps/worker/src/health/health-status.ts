/** Body of GET /health/live and GET /health/ready. */
export class HealthStatus {
  readonly status: 'ok' | 'unavailable';

  constructor(readonly checks: Record<string, 'ok' | 'unavailable'>) {
    this.status = Object.values(checks).every((check) => check === 'ok') ? 'ok' : 'unavailable';
  }
}
