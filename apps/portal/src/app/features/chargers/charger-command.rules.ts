import { Charger, Connector } from '../../core/api/models/charger';

/**
 * Which remote commands a charger and its connectors can take right now. Every command needs
 * the charger online: a reset is never queued, and the others would only wait five minutes.
 */
export class ChargerCommandRules {
  static readonly STARTABLE = ['available', 'preparing', 'occupied', 'unknown'];
  /** A remote stop only makes sense while the transaction runs (not once it has stopped). */
  static readonly STOPPABLE = ['charging', 'suspended', 'idle'];

  /** Why no command can be sent now, or null when they can. */
  static blockedReason(charger: Charger, isReadOnly: boolean): string | null {
    if (isReadOnly) {
      return 'The account is suspended, so no commands can be sent.';
    }
    if (!charger.is_online) {
      return 'The charger is offline. Commands can be sent once it connects again.';
    }
    return null;
  }

  static canStart(connector: Connector | null): boolean {
    return (
      !!connector &&
      !connector.active_session &&
      ChargerCommandRules.STARTABLE.includes(connector.status)
    );
  }

  static canStop(connector: Connector | null): boolean {
    return ChargerCommandRules.STOPPABLE.includes(connector?.active_session?.status ?? '');
  }
}
