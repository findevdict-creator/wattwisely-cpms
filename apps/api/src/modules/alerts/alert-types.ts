/** The alert types (story NTF-04) and the words the portal shows for them. */
export class AlertTypes {
  static readonly ALL = [
    'charger_offline',
    'connector_faulted',
    'session_stuck',
    'start_failures',
    'reset_no_return',
  ] as const;
  static readonly STATUSES = ['open', 'acknowledged', 'closed'] as const;
}

/** One alert type. */
export type AlertType = (typeof AlertTypes.ALL)[number];

/** Where an alert is in its life. */
export type AlertStatus = (typeof AlertTypes.STATUSES)[number];
