/** What every delivery's body says before its data: which event, when, for which tenant. */
export interface WebhookEventFields {
  /** The delivery's own id, so a receiver can tell a retry from a new event. */
  id: string;
  type: string;
  tenantId: string;
  occurredAt: Date;
  data: Record<string, unknown>;
}

/**
 * The JSON body of a delivery (module 16): `{ id, type, occurred_at, tenant_id, data }`, with
 * the fields in snake_case as everywhere in the API. The same shape for every event type,
 * so a receiver reads `type` first and `data` after.
 */
export class WebhookEventEnvelope {
  static build(fields: WebhookEventFields): Record<string, unknown> {
    return {
      id: fields.id,
      type: fields.type,
      occurred_at: fields.occurredAt.toISOString(),
      tenant_id: fields.tenantId,
      data: fields.data,
    };
  }
}
