import { TestDatabase } from '@wattwisely/db/testing';
import { DriverChargesFixture } from './driver-charges.fixture';

/**
 * Module 19 part 2: the cards a driver saves to their login. One customer per driver on the
 * platform's own provider account; the card itself only ever reaches the provider's form.
 */
(TestDatabase.isConfigured() ? describe : describe.skip)('Driver payment methods', () => {
  const stage = new DriverChargesFixture();
  const { api } = stage;

  beforeAll(() => stage.start());
  afterAll(() => stage.stop());

  it('saves cards on the platform account, the first as the default', async () => {
    const empty = await api.call('GET', '/v1/driver/payment-methods', { token: stage.danaToken });
    expect(empty.json()).toEqual({ items: [], is_provider_enabled: true });

    const first = await stage.saveCard(stage.danaToken);
    const second = await stage.saveCard(stage.danaToken, {
      brand: 'mastercard',
      last4: '4444',
      expMonth: 1,
      expYear: 2031,
    });
    expect(first.statusCode).toBe(201);
    expect(first.json()).toMatchObject({ brand: 'visa', last4: '4242', is_default: true });
    expect(second.json()).toMatchObject({ brand: 'mastercard', is_default: false });
    expect([...api.gateway.savedCards.customers.values()][0]).toMatchObject({
      email: 'dana@example.com',
    });

    const promoted = await api.call('PATCH', `/v1/driver/payment-methods/${second.json().id}`, {
      token: stage.danaToken,
      body: { is_default: true },
    });
    expect(promoted.json().is_default).toBe(true);
    const removed = await api.call('DELETE', `/v1/driver/payment-methods/${second.json().id}`, {
      token: stage.danaToken,
    });
    expect(removed.statusCode).toBe(204);
    const list = await api.call('GET', '/v1/driver/payment-methods', { token: stage.danaToken });
    expect(list.json().items).toEqual([
      expect.objectContaining({ last4: '4242', is_default: true }),
    ]);
    expect(api.gateway.savedCards.detached).toHaveLength(1);

    const unfinished = await api.call('POST', '/v1/driver/payment-methods/setup', {
      token: stage.danaToken,
    });
    const notYet = await api.call('POST', '/v1/driver/payment-methods', {
      token: stage.danaToken,
      body: { setup_id: unfinished.json().setup_id },
    });
    expect(notYet.json().code).toBe('card_setup_incomplete');
    const guysView = await api.call('GET', '/v1/driver/payment-methods', { token: stage.guyToken });
    expect(guysView.json().items).toEqual([]);
  });
});
