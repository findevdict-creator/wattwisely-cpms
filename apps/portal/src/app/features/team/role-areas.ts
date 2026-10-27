import { Permission, Role } from '../../core/api/models/role';

/** Whether a role holds the one permission of a column, or the area has none for it. */
export type AreaCell = 'held' | 'not_held' | 'none';

/** One area of the product as a row of the role's matrix. */
export interface AreaRow {
  area: string;
  name: string;
  isLocked: boolean;
  view: AreaCell;
  edit: AreaCell;
  remove: AreaCell;
  /** Every other permission of the area, such as chargers:command. */
  special: { key: string; label: string; isHeld: boolean }[];
}

/** A role as the roles page shows it: per area, view, create and edit, delete and the rest. */
export class RoleAreas {
  static readonly NAMES: Record<string, string> = {
    sites: 'Sites',
    chargers: 'Chargers',
    sessions: 'Sessions',
    tariffs: 'Tariffs',
    payments: 'Payments and refunds',
    invoices: 'Invoices',
    drivers: 'Drivers',
    alerts: 'Alerts',
    reports: 'Reports',
    load_management: 'Load management',
    messaging: 'WhatsApp charging',
    team: 'Team and roles',
    audit: 'Audit log',
    settings: 'Settings',
  };

  /** The column each verb fills; any other verb is a special action. */
  static readonly COLUMNS: Record<string, 'view' | 'edit' | 'remove'> = {
    read: 'view',
    write: 'edit',
    delete: 'remove',
  };

  static of(role: Role, permissions: Permission[]): AreaRow[] {
    const rows = new Map<string, AreaRow>();
    for (const permission of permissions) {
      const row = rows.get(permission.area) ?? RoleAreas.emptyRow(permission.area);
      const isHeld = role.permissions.includes(permission.key);
      const column = RoleAreas.COLUMNS[permission.key.split(':')[1]];
      if (column) {
        row[column] = isHeld ? 'held' : 'not_held';
      } else {
        row.special.push({ key: permission.key, label: permission.label, isHeld });
      }
      row.isLocked = row.isLocked || permission.is_locked;
      rows.set(permission.area, row);
    }
    const order = Object.keys(RoleAreas.NAMES);
    const rank = (area: string) => (order.includes(area) ? order.indexOf(area) : order.length);
    return [...rows.values()].sort((a, b) => rank(a.area) - rank(b.area));
  }

  /** "All 39", or how many the role holds. */
  static countOf(role: Role, permissions: Permission[]): string {
    const held = permissions.filter((permission) => role.permissions.includes(permission.key));
    return held.length === permissions.length && held.length > 0
      ? `All ${held.length}`
      : String(held.length);
  }

  private static emptyRow(area: string): AreaRow {
    const name =
      RoleAreas.NAMES[area] ?? area.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
    return { area, name, isLocked: false, view: 'none', edit: 'none', remove: 'none', special: [] };
  }
}
