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
    capture_above_hold: 'The price was above the card hold; only the hold was taken',
  };

  static readonly FAILURE: Record<string, string> = {
    no_valid_stop_data: 'The charger never reported how it ended',
    stale: 'The charger went silent for a day',
    closed_by_staff: 'Closed by staff',
    declined: 'The card was refused or never confirmed',
    start_timeout: 'The charger did not start in time',
    start_rejected: 'The charger refused to start',
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

  /** Where a card payment stands (module 6). */
  static readonly PAYMENT: Record<string, string> = {
    pending: 'Waiting for the card',
    authorised: 'Hold on the card',
    captured: 'Taken',
    released: 'Hold released',
    failed: 'Card refused',
    capture_failed: 'Could not take the payment',
    partially_refunded: 'Partly refunded',
    refunded: 'Refunded',
  };

  static readonly REFUND: Record<string, string> = {
    awaiting_approval: 'Needs approval',
    pending: 'Sent to the provider',
    succeeded: 'Refunded',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };

  /** How far the company's Stripe account has come. */
  static readonly PAYMENT_ACCOUNT: Record<string, string> = {
    not_connected: 'Not connected',
    pending: 'Setup not finished',
    active: 'Taking payments',
    restricted: 'Restricted by Stripe',
  };

  /** Where the managed service agreement stands (module 10). */
  static readonly MANAGED_SERVICE: Record<string, string> = {
    pending_acceptance: 'Waiting for your acceptance',
    active: 'Managed by Wattwisely',
    ending: 'Ending',
    ended: 'Ended',
    withdrawn: 'Withdrawn',
  };

  /** Where a proposed tariff change stands. */
  static readonly PROPOSAL: Record<string, string> = {
    proposed: 'Waiting for approval',
    approved: 'Approved',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  };

  static readonly COMMAND_ACTION: Record<string, string> = {
    remote_start: 'Start charging',
    remote_stop: 'Stop charging',
    reset: 'Reset',
    unlock: 'Unlock connector',
    change_availability: 'Change availability',
    set_charging_profile: 'Set power cap',
    clear_charging_profile: 'Remove power cap',
  };

  /**
   * Which statuses get which tone of chip (packages/ui, colors from theme.json); anything else
   * is neutral, like an offline charger or a finished session.
   */
  static readonly TONES: Record<'live' | 'ok' | 'info' | 'warn' | 'danger', string[]> = {
    live: ['charging'],
    ok: [
      'ok',
      'available',
      'accepted',
      'captured',
      'succeeded',
      'active',
      'approved',
      'paid',
      'delivered',
    ],
    info: [
      'preparing',
      'finishing',
      'reserved',
      'queued',
      'sent',
      'authorising',
      'starting',
      'stopping',
      'pending',
      'authorised',
      'awaiting_approval',
      'pending_acceptance',
      'proposed',
      'issued',
    ],
    warn: ['occupied', 'suspended_ev', 'suspended_evse', 'ending', 'overdue'],
    danger: [
      'problem',
      'faulted',
      'rejected',
      'timed_out',
      'failed',
      'capture_failed',
      'restricted',
      'revoked',
      'expired',
      'blocked',
    ],
  };

  /** The chip's tone class: live, ok, info, warn, danger or neutral. */
  static toneOf(status: string): string {
    const tones = Object.keys(StatusLabels.TONES) as (keyof typeof StatusLabels.TONES)[];
    return tones.find((tone) => StatusLabels.TONES[tone].includes(status)) ?? 'neutral';
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

  static payment(status: string): string {
    return StatusLabels.PAYMENT[status] ?? status;
  }

  static refund(status: string): string {
    return StatusLabels.REFUND[status] ?? status;
  }

  static paymentAccount(status: string): string {
    return StatusLabels.PAYMENT_ACCOUNT[status] ?? status;
  }

  static managedService(status: string): string {
    return StatusLabels.MANAGED_SERVICE[status] ?? status;
  }

  static proposal(status: string): string {
    return StatusLabels.PROPOSAL[status] ?? status;
  }

  static commandAction(action: string): string {
    return StatusLabels.COMMAND_ACTION[action] ?? action;
  }
}
