import { Charger, ChargerStatus } from '../../core/api/models/charger';

export type ChargerTabKey = 'all' | 'online' | 'charging' | 'offline' | 'faulted';

/** The tabs over the chargers list, each a set of statuses the API filters by. */
export class ChargerTabs {
  static readonly TABS: { key: ChargerTabKey; label: string; statuses: ChargerStatus[] }[] = [
    { key: 'all', label: 'All', statuses: [] },
    {
      key: 'online',
      label: 'Online',
      statuses: ['available', 'charging', 'faulted', 'unavailable'],
    },
    { key: 'charging', label: 'Charging', statuses: ['charging'] },
    { key: 'offline', label: 'Offline', statuses: ['offline', 'waiting'] },
    { key: 'faulted', label: 'Faulted', statuses: ['faulted'] },
  ];

  static statusesOf(key: ChargerTabKey): ChargerStatus[] {
    return ChargerTabs.TABS.find((tab) => tab.key === key)?.statuses ?? [];
  }

  /** "6 chargers · 4 online"; "50 shown · 47 online" while more pages wait. */
  static summary(chargers: Charger[], hasMore: boolean): string {
    const online = chargers.filter((charger) => charger.is_online).length;
    const count = hasMore
      ? `${chargers.length} shown`
      : `${chargers.length} ${chargers.length === 1 ? 'charger' : 'chargers'}`;
    return `${count} · ${online} online`;
  }
}
