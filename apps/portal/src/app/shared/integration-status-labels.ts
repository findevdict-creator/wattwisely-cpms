/** The words for API key, webhook endpoint and delivery statuses (module 16). */
export class IntegrationStatusLabels {
  static readonly API_KEY: Record<string, string> = {
    active: 'Active',
    expired: 'Expired',
    revoked: 'Revoked',
  };

  static readonly WEBHOOK: Record<string, string> = {
    active: 'Active',
    paused: 'Paused',
  };

  static readonly DELIVERY: Record<string, string> = {
    pending: 'Waiting to send',
    delivered: 'Delivered',
    failed: 'Failed',
  };

  static apiKey(status: string): string {
    return IntegrationStatusLabels.API_KEY[status] ?? status;
  }

  static webhook(status: string): string {
    return IntegrationStatusLabels.WEBHOOK[status] ?? status;
  }

  static delivery(status: string): string {
    return IntegrationStatusLabels.DELIVERY[status] ?? status;
  }
}
