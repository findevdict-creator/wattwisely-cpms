/** The words and colours the portal uses for site, charger, connector and session statuses. */
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

  static readonly SESSION: Record<string, string> = {
    authorising: 'Authorising',
    starting: 'Starting',
    charging: 'Charging',
    suspended: 'Paused',
    idle: 'Idle, still plugged in',
    stopping: 'Stopped, waiting to price',
    completed: 'Completed',
    not_started: 'Did not start',
    failed: 'Failed',
  };

  /** Why a session needs a look before it is charged to the driver. */
  static readonly REVIEW_FLAG: Record<string, string> = {
    long_session: 'Longer than 48 hours',
    gap_crosses_band: 'Readings missing across a price change',
    no_energy: 'No energy delivered',
    meter_reset: 'Meter went backwards',
    implausible_jump: 'Meter jumped more than the connector can deliver',
    no_tariff: 'The site had no tariff',
  };

  static readonly FAILURE: Record<string, string> = {
    no_valid_stop_data: 'The charger never reported how it ended',
    stale: 'The charger went silent for a day',
    closed_by_staff: 'Closed by staff',
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
    if (['ok', 'available', 'accepted', 'completed'].includes(status)) {
      return 'good';
    }
    if (
      [
        'charging',
        'preparing',
        'finishing',
        'occupied',
        'reserved',
        'queued',
        'sent',
        'authorising',
        'starting',
        'stopping',
      ].includes(status)
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

  static session(status: string): string {
    return StatusLabels.SESSION[status] ?? status;
  }

  static reviewFlag(flag: string): string {
    return StatusLabels.REVIEW_FLAG[flag] ?? flag;
  }

  static failure(reason: string | null): string {
    return reason ? (StatusLabels.FAILURE[reason] ?? reason) : '';
  }

  static command(status: string): string {
    return StatusLabels.COMMAND[status] ?? status;
  }

  static commandAction(action: string): string {
    return StatusLabels.COMMAND_ACTION[action] ?? action;
  }
}
