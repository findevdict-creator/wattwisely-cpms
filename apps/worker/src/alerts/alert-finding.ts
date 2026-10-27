/** The problems the platform raises alerts for (story NTF-04). */
export type AlertType =
  'charger_offline' | 'connector_faulted' | 'session_stuck' | 'start_failures' | 'reset_no_return';

/**
 * One problem a detector sees right now. The subject key says what it is about (a charger,
 * a connector or a session), so the same problem seen again updates its alert instead of
 * opening another.
 */
export interface AlertFinding {
  type: AlertType;
  subjectKey: string;
  siteId: string;
  chargerId: string;
  connectorId: string | null;
  sessionId: string | null;
  title: string;
  details: Record<string, unknown>;
  beganAt: Date;
}
