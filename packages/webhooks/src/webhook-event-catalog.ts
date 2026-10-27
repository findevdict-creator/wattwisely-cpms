/** One kind of event a tenant's systems can be told about. */
export interface WebhookEventDefinition {
  readonly key: string;
  /** The object the payload carries: session, alert, or nothing for a ping. */
  readonly subject: 'session' | 'alert' | 'none';
  readonly label: string;
  readonly description: string;
}

/**
 * Every event type a webhook endpoint can listen for (module 16). The worker finds the
 * events in the sessions and alerts tables and the API offers the list to the portal; a type
 * that is not here cannot be chosen. New types are added here and in the worker's sources.
 */
export class WebhookEventCatalog {
  static readonly PING = 'ping';

  static readonly ENTRIES: readonly WebhookEventDefinition[] = [
    {
      key: 'session.started',
      subject: 'session',
      label: 'Session started',
      description: 'A charging session began delivering energy',
    },
    {
      key: 'session.completed',
      subject: 'session',
      label: 'Session completed',
      description: 'A session ended and has its final price',
    },
    {
      key: 'session.failed',
      subject: 'session',
      label: 'Session failed',
      description: 'A session did not start, or ended without valid data',
    },
    {
      key: 'alert.opened',
      subject: 'alert',
      label: 'Alert opened',
      description: 'A charger alert was raised: offline, faulted, stuck, failing starts',
    },
    {
      key: 'alert.closed',
      subject: 'alert',
      label: 'Alert closed',
      description: 'A charger alert cleared',
    },
  ];

  static find(key: string): WebhookEventDefinition | undefined {
    return WebhookEventCatalog.ENTRIES.find((entry) => entry.key === key);
  }

  static isKnown(key: string): boolean {
    return WebhookEventCatalog.find(key) !== undefined;
  }

  /** The keys, cleaned: unknown ones named, each once, in the catalogue's order. */
  static normalise(keys: readonly string[]): string[] {
    const wanted = new Set(keys.map((key) => key.trim()));
    return WebhookEventCatalog.ENTRIES.map((entry) => entry.key).filter((key) => wanted.has(key));
  }

  static unknown(keys: readonly string[]): string[] {
    return keys.filter((key) => !WebhookEventCatalog.isKnown(key.trim()));
  }
}
