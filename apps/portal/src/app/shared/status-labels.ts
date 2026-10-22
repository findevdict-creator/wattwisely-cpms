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

  static readonly COMMAND: Record<string, string> = {
    queued: 'Waiting for the charger',
    sent: 'Sent',
    accepted: 'Accepted',
    rejected: 'Rejected',
    timed_out: 'No answer',
    expired: 'Expired',
    failed: 'Failed',
  };

  static readonly COMMAND_ACTION: Record<string, string> = {
    remote_start: 'Start charging',
    remote_stop: 'Stop charging',
    reset: 'Reset',
    unlock: 'Unlock connector',
    change_availability: 'Change availability',
  };

  /** The CSS tone class: good, busy, bad or quiet. */
  static toneOf(status: string): string {
    if (['ok', 'available', 'accepted'].includes(status)) {
      return 'good';
    }
    if (
      ['charging', 'preparing', 'finishing', 'occupied', 'reserved', 'queued', 'sent'].includes(
        status,
      )
    ) {
      return 'busy';
    }
    if (['problem', 'offline', 'faulted', 'rejected', 'timed_out', 'failed'].includes(status)) {
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

  static command(status: string): string {
    return StatusLabels.COMMAND[status] ?? status;
  }

  static commandAction(action: string): string {
    return StatusLabels.COMMAND_ACTION[action] ?? action;
  }
}
