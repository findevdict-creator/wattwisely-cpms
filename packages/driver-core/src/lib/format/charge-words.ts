/** The words the driver sees for the states the API reports. */
export class ChargeWords {
  static readonly SESSION: Record<string, string> = {
    authorising: 'Waiting for your card',
    starting: 'Starting the charger',
    charging: 'Charging',
    suspended: 'Paused',
    idle: 'Charging finished, still plugged in',
    stopping: 'Stopped, working out the price',
    completed: 'Completed',
    not_started: 'Did not start',
    failed: 'Something went wrong',
  };

  static readonly PAYMENT: Record<string, string> = {
    pending: 'Waiting for your card',
    authorised: 'Hold on your card',
    captured: 'Paid',
    released: 'Hold released, nothing taken',
    failed: 'Card refused',
    capture_failed: 'The payment could not be taken',
    partially_refunded: 'Partly refunded',
    refunded: 'Refunded',
  };

  /** Why a charge ended without charging, in a sentence. */
  static readonly FAILURE: Record<string, string> = {
    declined: 'The card was refused or never confirmed. Nothing was taken.',
    start_timeout: 'The charger did not start in time. The hold was released.',
    start_rejected: 'The charger refused to start. The hold was released.',
    no_valid_stop_data: 'The charger never reported how the charge ended. Staff will look at it.',
    stale: 'The charger went silent. Staff will look at it.',
    closed_by_staff: 'Closed by the operator’s staff.',
  };

  static readonly AVAILABILITY: Record<string, string> = {
    available: 'Ready to charge',
    busy: 'In use',
    offline: 'Charger offline',
    out_of_service: 'Out of service',
    faulted: 'Fault reported',
  };

  static readonly CONNECTOR_TYPE: Record<string, string> = {
    ccs1: 'CCS1',
    ccs2: 'CCS',
    type1: 'Type 1',
    type2: 'Type 2',
    chademo: 'CHAdeMO',
    gbt: 'GB/T',
    nacs: 'NACS',
    unknown: '',
  };

  static session(status: string): string {
    return ChargeWords.SESSION[status] ?? status;
  }

  static payment(status: string): string {
    return ChargeWords.PAYMENT[status] ?? status;
  }

  static failure(reason: string | null, message: string | null): string {
    if (reason === 'declined' && message) {
      return `The card was refused: ${message}`;
    }
    return reason ? (ChargeWords.FAILURE[reason] ?? reason) : 'Nothing was taken.';
  }

  static availability(availability: string): string {
    return ChargeWords.AVAILABILITY[availability] ?? availability;
  }

  static connectorType(type: string): string {
    return ChargeWords.CONNECTOR_TYPE[type] ?? type.toUpperCase();
  }
}
