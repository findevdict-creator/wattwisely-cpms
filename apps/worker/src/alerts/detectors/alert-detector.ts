import { Transaction } from '@wattwisely/db';
import { AlertFinding, AlertType } from '../alert-finding';

/**
 * Looks for one kind of problem across a tenant's chargers. A detector only reports what
 * is wrong now; the tracker opens, updates and closes the alerts from that.
 */
export abstract class AlertDetector {
  abstract readonly type: AlertType;

  abstract find(tx: Transaction, now: Date): Promise<AlertFinding[]>;
}
