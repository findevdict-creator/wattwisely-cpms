import { Charge } from '../api/models/charge';
import { MyChargesStore } from './my-charges.store';

describe('MyChargesStore', () => {
  const charge = (key: string, status: Charge['session_status'] = 'charging'): Charge =>
    ({
      charge_key: key,
      operator_name: 'Acme Charging',
      site_name: 'Riverside',
      charger_identity: 'CP-RIVER-1',
      connector_label: 'A',
      started_at: '2026-03-10T16:30:00Z',
      session_status: status,
      currency: 'GBP',
      amount: 880,
    }) as Charge;

  beforeEach(() => localStorage.clear());

  it('keeps the newest charge first and updates one it already knows', () => {
    const store = new MyChargesStore();
    store.remember(charge('first'));
    store.remember(charge('second'));
    store.remember(charge('first', 'completed'));

    expect(store.charges().map((item) => [item.key, item.session_status])).toEqual([
      ['first', 'completed'],
      ['second', 'charging'],
    ]);
    expect(new MyChargesStore().charges()).toHaveLength(2);
  });

  it('forgets a charge and survives broken storage', () => {
    const store = new MyChargesStore();
    store.remember(charge('first'));
    store.forget('first');
    expect(store.charges()).toEqual([]);

    localStorage.setItem(MyChargesStore.STORAGE_KEY, 'not json');
    expect(new MyChargesStore().charges()).toEqual([]);
  });

  it('keeps at most twenty charges', () => {
    const store = new MyChargesStore();
    for (let index = 0; index < 25; index += 1) {
      store.remember(charge(`key-${index}`));
    }
    expect(store.charges()).toHaveLength(MyChargesStore.LIMIT);
    expect(store.charges()[0].key).toBe('key-24');
  });
});
