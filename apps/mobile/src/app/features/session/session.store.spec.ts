import { TestBed } from '@angular/core/testing';
import { DriverChargesApiService } from '@wattwisely/driver-core';
import { of } from 'rxjs';
import { ChargingFixtures } from '../../core/charging/charging.fixture';
import { SessionStore } from './session.store';

describe('SessionStore', () => {
  afterEach(() => jest.useRealTimers());

  it('picks the screen for each state of the charge', () => {
    const view = (changes: Parameters<typeof ChargingFixtures.charge>[0]) =>
      SessionStore.view(ChargingFixtures.charge(changes));
    expect(view({ status: 'starting' })).toBe('starting');
    expect(view({ status: 'charging' })).toBe('live');
    expect(view({ status: 'idle' })).toBe('live');
    expect(view({ status: 'completed' })).toBe('complete');
    expect(view({ status: 'not_started' })).toBe('failed');
    const refused = { ...ChargingFixtures.PAYMENT, status: 'failed' };
    expect(view({ status: 'authorising', payment: refused })).toBe('failed');
  });

  it('waits for the hold to be taken before it calls a charge settled', () => {
    const completed = ChargingFixtures.charge({ status: 'completed' });
    expect(SessionStore.isSettled(completed)).toBe(false);
    const captured = { ...ChargingFixtures.PAYMENT, status: 'captured' };
    expect(SessionStore.isSettled({ ...completed, payment: captured })).toBe(true);
    expect(SessionStore.isSettled({ ...completed, is_paid: false, payment: null })).toBe(true);
  });

  it('follows a live charge every 3 seconds, with the readings every third time', async () => {
    jest.useFakeTimers();
    const api = {
      charge: jest.fn(() => of(ChargingFixtures.charge({ status: 'charging' }))),
      readings: jest.fn(() => of([])),
    };
    TestBed.configureTestingModule({
      providers: [SessionStore, { provide: DriverChargesApiService, useValue: api }],
    });
    const store = TestBed.inject(SessionStore);
    await store.follow('session-1');
    for (let tick = 0; tick < 3; tick++) {
      await jest.advanceTimersByTimeAsync(SessionStore.POLL_MS);
    }
    expect(api.charge).toHaveBeenCalledTimes(4);
    expect(api.readings).toHaveBeenCalledTimes(2);
    store.unfollow();
    await jest.advanceTimersByTimeAsync(SessionStore.POLL_MS * 2);
    expect(api.charge).toHaveBeenCalledTimes(4);
  });
});
