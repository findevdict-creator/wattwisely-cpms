import { SessionState } from '../state/session-state';

/** What a session.updated or session.cost_updated event says, in the API's snake_case. */
export class SessionEventData {
  static of(
    session: { id: string; connectorId: string; currency: string | null },
    change: { status: SessionState; energyWh: number; grossAmount?: number | null },
  ): Record<string, unknown> {
    return {
      session_id: session.id,
      connector_id: session.connectorId,
      status: change.status,
      energy_wh: change.energyWh,
      gross_amount: change.grossAmount ?? null,
      currency: session.currency,
    };
  }
}
