export type CommandAction =
  | 'remote_start'
  | 'remote_stop'
  | 'reset'
  | 'unlock'
  | 'change_availability'
  | 'set_charging_profile'
  | 'clear_charging_profile';
export type CommandStatus =
  'queued' | 'sent' | 'accepted' | 'rejected' | 'timed_out' | 'expired' | 'failed';

/** A command sent to a charger, from POST /v1/chargers/{id}/commands/* and GET /v1/commands/{id}. */
export interface ChargerCommand {
  id: string;
  charger_id: string;
  action: CommandAction;
  payload: Record<string, unknown>;
  status: CommandStatus;
  queued_until: string;
  requested_by_label: string;
  result: unknown;
  error: string | null;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CommandPage {
  items: ChargerCommand[];
  next_cursor: string | null;
}

/** One OCPP frame from GET /v1/chargers/{id}/messages. */
export interface OcppMessage {
  id: string;
  direction: 'in' | 'out';
  message_type: 'call' | 'call_result' | 'call_error';
  message_id: string;
  action: string;
  payload: unknown;
  error_code: string | null;
  received_at: string;
}

export interface OcppMessagePage {
  items: OcppMessage[];
  next_cursor: string | null;
}
