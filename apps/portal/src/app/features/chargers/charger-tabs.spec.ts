import { Charger } from '../../core/api/models/charger';
import { ChargerTabs } from './charger-tabs';

describe('ChargerTabs', () => {
  const charger = (isOnline: boolean) => ({ is_online: isOnline }) as Charger;

  it('filters each tab by its statuses, and All by none', () => {
    expect(ChargerTabs.statusesOf('all')).toEqual([]);
    expect(ChargerTabs.statusesOf('offline')).toEqual(['offline', 'waiting']);
    expect(ChargerTabs.statusesOf('online')).toContain('faulted');
  });

  it('counts the chargers and those online', () => {
    const chargers = [charger(true), charger(true), charger(false)];
    expect(ChargerTabs.summary(chargers, false)).toBe('3 chargers · 2 online');
    expect(ChargerTabs.summary(chargers, true)).toBe('3 shown · 2 online');
  });
});
