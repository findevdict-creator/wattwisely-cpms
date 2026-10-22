/**
 * The Postgres LISTEN/NOTIFY channels the API and the gateway talk over. M1 runs one
 * gateway instance, so Postgres carries both the command hand-off and the live events;
 * the OCPP gateway design's Valkey streams can replace this when instances multiply.
 */
export class NotifyChannels {
  /** The API tells the gateway a command row is waiting (payload: CommandNotification). */
  static readonly COMMANDS = 'charger_commands';

  /** The gateway tells the API what happened on a charger (payload: ChargerEvent). */
  static readonly EVENTS = 'charger_events';

  /** Postgres refuses NOTIFY payloads of 8000 bytes or more. */
  static readonly MAX_PAYLOAD_BYTES = 7_900;
}

export interface CommandNotification {
  command_id: string;
  charger_id: string;
  tenant_id: string;
}
