/** The words and colours the portal uses for site, charger and connector statuses. */
export class StatusLabels {
  static readonly SITE: Record<string, string> = {
    ok: 'OK',
    problem: 'Problem',
    offline: 'Offline',
  };

  static readonly CHARGER: Record<string, string> = {
    waiting: 'Waiting for first connection',
    offline: 'Offline',
    faulted: 'Faulted',
    charging: 'Charging',
    available: 'Available',
    unavailable: 'Unavailable',
  };

  static readonly CONNECTOR: Record<string, string> = {
    available: 'Available',
    preparing: 'Preparing',
    charging: 'Charging',
    suspended_ev: 'Paused by car',
    suspended_evse: 'Paused by charger',
    finishing: 'Finishing',
    reserved: 'Reserved',
    occupied: 'Occupied',
    unavailable: 'Unavailable',
    faulted: 'Faulted',
    unknown: 'Not reported yet',
  };

  /** The CSS tone class: good, busy, bad or quiet. */
  static toneOf(status: string): string {
    if (['ok', 'available'].includes(status)) {
      return 'good';
    }
    if (['charging', 'preparing', 'finishing', 'occupied', 'reserved'].includes(status)) {
      return 'busy';
    }
    if (['problem', 'offline', 'faulted'].includes(status)) {
      return 'bad';
    }
    return 'quiet';
  }

  static site(status: string): string {
    return StatusLabels.SITE[status] ?? status;
  }

  static charger(status: string): string {
    return StatusLabels.CHARGER[status] ?? status;
  }

  static connector(status: string): string {
    return StatusLabels.CONNECTOR[status] ?? status;
  }
}
