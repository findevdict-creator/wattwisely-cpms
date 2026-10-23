import { PlaceAvailabilityPolicy } from './place-availability';

describe('PlaceAvailabilityPolicy', () => {
  const online = { isOnline: true, isBusy: false };

  it('offers a plug that is free on an online charger, even one never reported', () => {
    expect(PlaceAvailabilityPolicy.of({ ...online, connectorStatus: 'available' })).toBe(
      'available',
    );
    expect(PlaceAvailabilityPolicy.of({ ...online, connectorStatus: 'preparing' })).toBe(
      'available',
    );
    expect(PlaceAvailabilityPolicy.of({ ...online, connectorStatus: 'unknown' })).toBe('available');
  });

  it('says why a plug cannot be used', () => {
    expect(
      PlaceAvailabilityPolicy.of({ isOnline: false, isBusy: false, connectorStatus: 'available' }),
    ).toBe('offline');
    expect(PlaceAvailabilityPolicy.of({ ...online, connectorStatus: 'faulted' })).toBe('faulted');
    expect(PlaceAvailabilityPolicy.of({ ...online, connectorStatus: 'unavailable' })).toBe(
      'out_of_service',
    );
    expect(PlaceAvailabilityPolicy.of({ ...online, connectorStatus: 'charging' })).toBe('busy');
    expect(
      PlaceAvailabilityPolicy.of({ isOnline: true, isBusy: true, connectorStatus: 'available' }),
    ).toBe('busy');
  });

  it('puts the charger before the plug: an offline charger is offline whatever the plug said', () => {
    expect(
      PlaceAvailabilityPolicy.of({ isOnline: false, isBusy: true, connectorStatus: 'faulted' }),
    ).toBe('offline');
  });
});
