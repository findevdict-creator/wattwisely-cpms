import { WebhookEventCatalog } from './webhook-event-catalog';

describe('WebhookEventCatalog', () => {
  it('cleans a list of keys to known ones, each once, in catalogue order', () => {
    const keys = [' alert.opened', 'session.completed', 'session.completed', 'session.started'];

    expect(WebhookEventCatalog.normalise(keys)).toEqual([
      'session.started',
      'session.completed',
      'alert.opened',
    ]);
    expect(WebhookEventCatalog.unknown(['session.started', 'charger.exploded'])).toEqual([
      'charger.exploded',
    ]);
    expect(WebhookEventCatalog.isKnown('ping')).toBe(false);
  });
});
