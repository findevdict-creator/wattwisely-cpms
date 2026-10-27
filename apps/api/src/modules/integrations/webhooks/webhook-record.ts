/** A webhook_endpoints row as the repository returns it. */
export interface WebhookRecord {
  id: string;
  tenantId: string;
  url: string;
  description: string;
  secret: string;
  eventTypes: string[];
  isActive: boolean;
  failureCount: number;
  lastDeliveryAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/** A webhook_deliveries row, for the endpoint's page. */
export interface WebhookDeliveryRecord {
  id: string;
  endpointId: string;
  eventType: string;
  eventId: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  nextAttemptAt: Date;
  lastAttemptAt: Date | null;
  lastStatusCode: number | null;
  lastError: string | null;
  deliveredAt: Date | null;
  createdAt: Date;
}
