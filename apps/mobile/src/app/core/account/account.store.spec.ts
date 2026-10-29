import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { DriverApiService } from '@wattwisely/driver-core';
import { of, throwError } from 'rxjs';
import { AccountStore } from './account.store';

describe('AccountStore', () => {
  const me = { id: 'd-1', email: 'dana@acme.test', display_name: 'Dana Driver', phone: null };
  const operator = {
    tenant_id: 't-1',
    operator_name: 'Acme Charging',
    operator_slug: 'acme',
    driver_name: 'Dana',
    reference: 'D-1',
    status: 'active',
    payment_mode: 'inherit',
    linked_at: '2026-03-12T10:00:00Z',
  };

  function storeWith(api: Partial<DriverApiService>): AccountStore {
    TestBed.configureTestingModule({ providers: [{ provide: DriverApiService, useValue: api }] });
    return TestBed.inject(AccountStore);
  }

  it('loads the driver and their operators', async () => {
    const store = storeWith({
      me: () => of(me),
      operators: () => of({ items: [operator] }),
    } as Partial<DriverApiService>);
    await store.load();
    expect(store.me()?.display_name).toBe('Dana Driver');
    expect(store.operators().map((item) => item.operator_name)).toEqual(['Acme Charging']);
  });

  it("shows the API's sentence when it fails, and forgets the driver on sign-out", async () => {
    const failure = new HttpErrorResponse({ status: 503, error: { detail: 'Try again soon.' } });
    const store = storeWith({
      me: () => throwError(() => failure),
      operators: () => of({ items: [] }),
    } as Partial<DriverApiService>);
    await store.load();
    expect(store.error()).toBe('Try again soon.');
    store.clear();
    expect(store.error()).toBe('');
    expect(store.me()).toBeNull();
  });
});
