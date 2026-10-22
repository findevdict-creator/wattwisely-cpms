import { ChargerEvent } from '../../core/api/models/charger-event';
import { ActiveSession, Charger, Connector } from '../../core/api/models/charger';

/**
 * Applies a live event to the charger on screen without a round trip: session energy
 * and cost tick every few seconds, so those change the connector in place. Status and
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
  static readonly SESSION_EVENTS: string[] = ['session.updated', 'session.cost_updated'];
  /** Once a session reaches one of these, the connector has no session any more. */
  static readonly END_STATES: string[] = ['completed', 'not_started', 'failed'];
  static readonly NEW_SESSION: Pick<ActiveSession, 'status' | 'energy_wh' | 'currency'> = {
    status: 'charging',
    energy_wh: 0,
    currency: null,
  };

  static needsReload(event: ChargerEvent): boolean {
    return LiveEventApplier.RELOAD_ON.includes(event.type);
  }

  /** The charger with the event applied, or the same charger when the event changes nothing on it. */
  static apply(charger: Charger, event: ChargerEvent): Charger {
    if (!LiveEventApplier.SESSION_EVENTS.includes(event.type)) {
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
    if (LiveEventApplier.END_STATES.includes(String(event.data['status']))) {
      return { ...connector, active_session: null };
    }
    const existing = connector.active_session;
    return {
      ...connector,
      active_session: {
        id: String(event.data['session_id']),
        ocpp_transaction_id: existing?.ocpp_transaction_id ?? 0,
        started_at: existing?.started_at ?? event.at,
        ...LiveEventApplier.progressOf(event, existing),
      },
    };
  }

  /** What the event says about the session now, falling back to what was on screen. */
  private static progressOf(
    event: ChargerEvent,
    existing: ActiveSession | null,
  ): Pick<ActiveSession, 'status' | 'energy_wh' | 'gross_amount' | 'currency'> {
    const data = event.data as {
      status?: ActiveSession['status'];
      energy_wh?: number;
      gross_amount?: number | null;
      currency?: string | null;
    };
    const fallback = existing ?? LiveEventApplier.NEW_SESSION;
    return {
      status: data.status ?? fallback.status,
      energy_wh: Number(data.energy_wh ?? fallback.energy_wh),
      gross_amount: data.gross_amount ?? null,
      currency: data.currency ?? fallback.currency,
    };
  }
}
