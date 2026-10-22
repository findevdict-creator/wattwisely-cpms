import { ChargerEvent } from '../../core/api/models/charger-event';
import { Charger, Connector } from '../../core/api/models/charger';

/**
 * Applies a live event to the charger on screen without a round trip: session energy
 * ticks every few seconds, so those change the connector in place. Status and
 * connection changes are rarer and have knock-on effects (the charger's own status),
 * so for those the page reloads the charger instead.
 */
export class LiveEventApplier {
  static readonly RELOAD_ON: string[] = [
    'connector.status',
    'charger.connected',
    'charger.booted',
    'charger.disconnected',
  ];

  static needsReload(event: ChargerEvent): boolean {
    return LiveEventApplier.RELOAD_ON.includes(event.type);
  }

  /** The charger with the event applied, or the same charger when the event changes nothing on it. */
  static apply(charger: Charger, event: ChargerEvent): Charger {
    if (event.type !== 'session.updated') {
      return charger;
    }
    return {
      ...charger,
      connectors: charger.connectors.map((connector) =>
        connector.id === event.data['connector_id']
          ? LiveEventApplier.withSession(connector, event)
          : connector,
      ),
    };
  }

  private static withSession(connector: Connector, event: ChargerEvent): Connector {
    if (event.data['status'] === 'ended') {
      return { ...connector, active_session: null };
    }
    const existing = connector.active_session;
    return {
      ...connector,
      active_session: {
        id: String(event.data['session_id']),
        ocpp_transaction_id: existing?.ocpp_transaction_id ?? 0,
        started_at: existing?.started_at ?? event.at,
        energy_wh: Number(event.data['energy_wh'] ?? existing?.energy_wh ?? 0),
      },
    };
  }
}
