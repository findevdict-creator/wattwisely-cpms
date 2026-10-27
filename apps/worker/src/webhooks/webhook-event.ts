/** One thing that happened in a tenant that endpoints may want to hear about (module 16). */
export interface WebhookEvent {
  /** e.g. session.completed, alert.opened. */
  type: string;
  /** Names the source row, so the same event is never delivered twice: a state change id, "<alert>:opened". */
  eventId: string;
  occurredAt: Date;
  data: Record<string, unknown>;
}

/** Where events come from: a table the worker reads for what happened between two moments. */
export interface WebhookEventSource {
  /** The event types this source can produce. */
  readonly types: readonly string[];
  /** The events that became known after `from` and up to `to`, oldest first. */
  collect(tx: unknown, from: Date, to: Date): Promise<WebhookEvent[]>;
}
