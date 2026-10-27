/** GET /v1/webhooks: where events go, with the signing secret (module 16). */
export interface WebhookEndpoint {
  id: string;
  url: string;
  description: string;
  secret: string;
  event_types: string[];
  is_active: boolean;
  /** Deliveries that failed in a row since the last one that got through. */
  failure_count: number;
  last_delivery_at: string | null;
  /** Sent back as If-Match when changing or removing the endpoint. */
  version: number;
  created_at: string;
}

/** Body of POST /v1/webhooks and PATCH /v1/webhooks/{id}. */
export interface WebhookInput {
  url: string;
  description: string;
  event_types: string[];
}

/** GET /v1/webhooks/{id}/deliveries: one event on its way to the endpoint. */
export interface WebhookDelivery {
  id: string;
  event_type: string;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  next_attempt_at: string | null;
  last_attempt_at: string | null;
  last_status_code: number | null;
  last_error: string | null;
  delivered_at: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

/** GET /v1/webhooks/event-types: one kind of event an endpoint can listen for. */
export interface WebhookEventType {
  key: string;
  label: string;
  description: string;
  subject: 'session' | 'alert' | 'none';
}
