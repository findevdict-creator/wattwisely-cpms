import { TestBed } from '@angular/core/testing';
import { DriverChargesApiService } from '@wattwisely/driver-core';
import { of } from 'rxjs';
import { LocationPermission, NativeLocation } from '../native/native-location';
import { NearbyFixtures } from './nearby.fixture';
import { NearbyWords } from './nearby-words';
import { NearbyStore } from './nearby.store';

describe('Nearby', () => {
  it('writes the operator, the distance and the price, or that members only charge', () => {
    expect(NearbyWords.line(NearbyFixtures.RIVERSIDE)).toMatch(
      /^Acme Charging · 0\.4 km · from €0\.30 per kWh$/,
    );
    expect(NearbyWords.line(NearbyFixtures.DEPOT)).toBe('Acme Charging · 12 km · members only');
    expect(NearbyWords.free(NearbyFixtures.RIVERSIDE)).toBe('2 of 4');
  });

  function setUp(permission: LocationPermission, position: jest.Mock) {
    const nearby = jest.fn(() => of({ items: [NearbyFixtures.RIVERSIDE] }));
    TestBed.configureTestingModule({
      providers: [
        { provide: DriverChargesApiService, useValue: { nearby } },
        {
          provide: NativeLocation,
          useValue: { permission: jest.fn(async () => permission), position },
        },
      ],
    });
    return { store: TestBed.inject(NearbyStore), nearby };
  }

  it('waits for the driver before asking for the location', async () => {
    const { store, nearby } = setUp(
      'prompt',
      jest.fn(async () => null),
    );
    await store.load();
    expect(store.state()).toBe('ask');
    expect(nearby).not.toHaveBeenCalled();
  });

  it('looks around the phone once allowed', async () => {
    const position = jest.fn(async () => ({ latitude: 53.35, longitude: -6.26 }));
    const { store, nearby } = setUp('granted', position);
    await store.load(true);
    expect(position).toHaveBeenCalledWith(true);
    expect(nearby).toHaveBeenCalledWith(53.35, -6.26);
    expect(store.state()).toBe('ready');
    expect(store.places()).toHaveLength(1);
  });

  it('says when the phone refused, or could not find itself', async () => {
    const refused = setUp(
      'denied',
      jest.fn(async () => null),
    );
    await refused.store.load(true);
    expect(refused.store.state()).toBe('denied');
    TestBed.resetTestingModule();

    const lost = setUp(
      'granted',
      jest.fn(async () => Promise.reject(new Error('timeout'))),
    );
    await lost.store.load();
    expect(lost.store.error()).toBe(NearbyStore.NO_FIX);
  });
});
