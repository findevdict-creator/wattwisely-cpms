import { AlertType } from '../../core/api/models/alert';

/** How bad each kind of alert is, as a chip: its tone in the shared chip style and its word. */
export class AlertSeverity {
  static readonly CHIPS: Record<AlertType, { tone: string; label: string }> = {
    connector_faulted: { tone: 'danger', label: 'Fault' },
    reset_no_return: { tone: 'danger', label: 'Not back' },
    charger_offline: { tone: 'neutral', label: 'Offline' },
    session_stuck: { tone: 'warn', label: 'Stalled' },
    start_failures: { tone: 'warn', label: 'Warning' },
  };

  static of(type: AlertType): { tone: string; label: string } {
    return AlertSeverity.CHIPS[type];
  }
}
