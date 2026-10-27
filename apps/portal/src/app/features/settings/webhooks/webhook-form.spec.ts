import { WebhookEndpoint } from '../../../core/api/models/webhook';
import { WebhookForm } from './webhook-form';

describe('WebhookForm', () => {
  const endpoint: WebhookEndpoint = {
    id: 'wh-1',
    url: 'https://hooks.example.com/wattwisely',
    description: 'Fleet tool',
    secret: 'whsec_x',
    event_types: ['session.completed'],
    is_active: true,
    failure_count: 0,
    last_delivery_at: null,
    version: 1,
    created_at: '2026-01-01T00:00:00Z',
  };

  it('insists on an https URL, letting http through only for localhost', () => {
    expect(WebhookForm.httpsUrl({ value: 'https://hooks.example.com/x' })).toBeNull();
    expect(WebhookForm.httpsUrl({ value: 'http://localhost:4000/x' })).toBeNull();
    expect(WebhookForm.httpsUrl({ value: 'http://hooks.example.com/x' })).toEqual({ https: true });
    expect(WebhookForm.httpsUrl({ value: 'not a url' })).toEqual({ url: true });
    expect(WebhookForm.httpsUrl({ value: '' })).toBeNull();
  });

  it('needs a URL and at least one event type', () => {
    const form = new WebhookForm();
    expect(form.isValid()).toBe(false);
    form.fields.patchValue({ url: 'https://hooks.example.com/x' });
    expect(form.isValid()).toBe(false);
    form.set('session.started', true);
    expect(form.isValid()).toBe(true);
    form.set('session.started', false);
    expect(form.isValid()).toBe(false);
  });

  it('starts from an endpoint and sends the body trimmed', () => {
    const form = WebhookForm.of(endpoint);
    expect(form.has('session.completed')).toBe(true);
    form.fields.patchValue({ url: ' https://hooks.example.com/new ', description: ' Moved ' });
    form.set('alert.opened', true);
    expect(form.toInput()).toEqual({
      url: 'https://hooks.example.com/new',
      description: 'Moved',
      event_types: ['session.completed', 'alert.opened'],
    });
  });
});
