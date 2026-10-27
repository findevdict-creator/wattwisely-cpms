import { Alert, AlertTypeLabels } from '../../core/api/models/alert';

/** One step in an alert's life. */
export interface TimelineStep {
  icon: string;
  title: string;
  text: string;
  at: string;
}

/** What happened to an alert, newest first, from what the alert itself records. */
export class AlertTimeline {
  static of(alert: Alert): TimelineStep[] {
    return [
      AlertTimeline.raised(alert),
      AlertTimeline.cameBack(alert),
      AlertTimeline.acknowledged(alert),
      AlertTimeline.cleared(alert),
    ]
      .filter((step): step is TimelineStep => step !== null)
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  private static raised(alert: Alert): TimelineStep {
    return {
      icon: 'triangle-alert',
      title: AlertTypeLabels.LABELS[alert.type],
      text: alert.title,
      at: alert.began_at,
    };
  }

  private static cameBack(alert: Alert): TimelineStep | null {
    return alert.occurrences > 1
      ? {
          icon: 'refresh-cw',
          title: 'Came back',
          text: `The problem came back ${alert.occurrences - 1}× after clearing.`,
          at: alert.last_seen_at,
        }
      : null;
  }

  private static acknowledged(alert: Alert): TimelineStep | null {
    return alert.acknowledged_at
      ? {
          icon: 'check',
          title: `Acknowledged by ${alert.acknowledged_by ?? 'someone on the team'}`,
          text: alert.acknowledge_note ? `“${alert.acknowledge_note}”` : '',
          at: alert.acknowledged_at,
        }
      : null;
  }

  private static cleared(alert: Alert): TimelineStep | null {
    return alert.closed_at
      ? {
          icon: 'circle-check',
          title: 'Cleared',
          text: 'The charger reported that the problem is gone.',
          at: alert.closed_at,
        }
      : null;
  }
}
