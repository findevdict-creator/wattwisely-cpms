/** What the gateway announces on the live event channel, and what the portal subscribes to. */
export type ChargerEventType =
  | 'charger.connected'
  | 'charger.booted'
  | 'charger.disconnected'
  | 'connector.status'
  | 'session.updated'
  | 'command.result';

/**
 * One live event about a charger. `data` depends on the type:
 *   connector.status  { connector_id, ocpp_connector_id, status, error_code }
 *   session.updated   { session_id, connector_id, status, energy_wh }
 *   command.result    { command_id, action, status, error }
 *   charger.*         {}
 */
export interface ChargerEvent {
  type: ChargerEventType;
  tenant_id: string;
  charger_id: string;
  /** When it happened, ISO 8601. */
  at: string;
  data: Record<string, unknown>;
}
