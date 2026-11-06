import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RuntimeConfig } from '../config/runtime-config';
import { SavedCardsStore } from './saved-cards.store';

describe('SavedCardsStore', () => {
  let store: SavedCardsStore;
  let http: HttpTestingController;
  const visa = {
    id: 'card-1',
    brand: 'visa',
    last4: '4242',
    exp_month: 12,
    exp_year: 2030,
    is_default: true,
    created_at: '2026-10-25T10:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SavedCardsStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: RuntimeConfig,
          useValue: new RuntimeConfig('https://api.test', 'https://auth.test', 'ww', 'driver'),
        },
      ],
    });
    store = TestBed.inject(SavedCardsStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const flushList = async (items: unknown[]) => {
    await Promise.resolve();
    http
      .expectOne('https://api.test/v1/driver/payment-methods')
      .flush({ items, is_provider_enabled: true });
  };

  it('opens a setup, saves the card the form confirmed and reads the list again', async () => {
    const begun = store.begin();
    http
      .expectOne('https://api.test/v1/driver/payment-methods/setup')
      .flush({ setup_id: 'seti_1', client_secret: 'seti_1_secret', publishable_key: 'pk' });
    await begun;
    expect(store.setup()?.setup_id).toBe('seti_1');

    const finished = store.finish();
    const save = http.expectOne('https://api.test/v1/driver/payment-methods');
    expect(save.request.body).toEqual({ setup_id: 'seti_1' });
    save.flush(visa);
    await flushList([visa]);
    await finished;

    expect(store.setup()).toBeNull();
    expect(store.cards()).toEqual([visa]);
  });

  it('makes the new card the default when the driver asked for it', async () => {
    const begun = store.begin();
    http
      .expectOne('https://api.test/v1/driver/payment-methods/setup')
      .flush({ setup_id: 'seti_2', client_secret: 'seti_2_secret', publishable_key: 'pk' });
    await begun;

    const mastercard = { ...visa, id: 'card-2', brand: 'mastercard', is_default: false };
    const finished = store.finish(true);
    http.expectOne('https://api.test/v1/driver/payment-methods').flush(mastercard);
    await Promise.resolve();
    const patch = http.expectOne('https://api.test/v1/driver/payment-methods/card-2');
    expect(patch.request.body).toEqual({ is_default: true });
    patch.flush({ ...mastercard, is_default: true });
    await flushList([
      { ...visa, is_default: false },
      { ...mastercard, is_default: true },
    ]);
    await finished;

    expect(store.cards().find((card) => card.is_default)?.id).toBe('card-2');
  });

  it('shows the API’s sentence when the provider is down', async () => {
    const begun = store.begin();
    http
      .expectOne('https://api.test/v1/driver/payment-methods/setup')
      .flush(
        { code: 'payments_unavailable', detail: 'Card payments are not available.' },
        { status: 503, statusText: 'Unavailable' },
      );
    await begun;

    expect(store.error()).toBe('Card payments are not available.');
    expect(store.isBusy()).toBe(false);
  });
});
