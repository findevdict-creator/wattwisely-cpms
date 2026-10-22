export type ChargerEventType =
  | 'charger.connected'
  | 'charger.booted'
  | 'charger.disconnected'
  | 'connector.status'
  | 'session.updated'
  | 'session.cost_updated'
  | 'command.result';

/** One event from GET /v1/chargers/{id}/live, as the gateway published it. */
export interface ChargerEvent {
  type: ChargerEventType;
  tenant_id: string;
  charger_id: string;
  at: string;
  data: Record<string, unknown>;
}
