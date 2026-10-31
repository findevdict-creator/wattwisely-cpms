import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CardFormFactory, PaymentMethod, SavedCardsStore } from '@wattwisely/driver-core';
import { CardAdder } from './card-adder';

describe('CardAdder', () => {
  const visa = { id: 'pm-1', brand: 'visa', last4: '4242', is_default: true } as PaymentMethod;
  const mastercard = { id: 'pm-2', brand: 'mastercard', last4: '5555', is_default: false };

  function setUp(isConfirmed = true, publishableKey: string | null = 'pk_test') {
    const form = {
      mount: jest.fn(async () => undefined),
      confirm: jest.fn(async () => ({ isConfirmed, message: isConfirmed ? null : 'Declined.' })),
      destroy: jest.fn(),
    };
    const cards = {
      cards: signal<PaymentMethod[]>([visa]),
      setup: signal<object | null>(null),
      isProviderEnabled: signal(true),
      error: signal(''),
      load: jest.fn(async () => undefined),
      begin: jest.fn(async () =>
        cards.setup.set({ setup_id: 's-1', client_secret: 'cs', publishable_key: publishableKey }),
      ),
      finish: jest.fn(async () => cards.cards.set([visa, mastercard as PaymentMethod])),
      makeDefault: jest.fn(async () => undefined),
      cancel: jest.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        CardAdder,
        { provide: SavedCardsStore, useValue: cards },
        { provide: CardFormFactory, useValue: { createSaver: jest.fn(() => form) } },
      ],
    });
    return { adder: TestBed.inject(CardAdder), cards, form };
  }

  it('opens Stripe’s form on a new setup, keeps the card and makes it the default', async () => {
    const { adder, cards, form } = setUp();
    const host = document.createElement('div');
    await adder.open(host);
    expect(form.mount).toHaveBeenCalledWith(host);
    expect(adder.isReady()).toBe(true);
    expect(await adder.save(true)).toBe(true);
    expect(cards.finish).toHaveBeenCalled();
    expect(cards.makeDefault).toHaveBeenCalledWith(mastercard);
  });

  it('leaves the default alone when asked', async () => {
    const { adder, cards } = setUp();
    await adder.open(document.createElement('div'));
    await adder.save(false);
    expect(cards.makeDefault).not.toHaveBeenCalled();
  });

  it('says why the bank refused a card, and keeps nothing', async () => {
    const { adder, cards } = setUp(false);
    await adder.open(document.createElement('div'));
    expect(await adder.save(true)).toBe(false);
    expect(adder.error()).toBe('Declined.');
    expect(cards.finish).not.toHaveBeenCalled();
  });

  it('says so when this installation takes no cards', async () => {
    const { adder, form } = setUp(true, null);
    await adder.open(document.createElement('div'));
    expect(adder.error()).toBe(CardAdder.UNAVAILABLE);
    expect(form.mount).not.toHaveBeenCalled();
  });
});
