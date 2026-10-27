/** What the platform can ask a charger to do. The names match the charger_command_action enum. */
export type CommandAction =
  | 'remote_start'
  | 'remote_stop'
  | 'reset'
  | 'unlock'
  | 'change_availability'
  | 'set_charging_profile'
  | 'clear_charging_profile';

/** The commands a person sends from the portal; the charging profile commands are the worker's (module 17). */
export type StaffCommandAction = Exclude<
  CommandAction,
  'set_charging_profile' | 'clear_charging_profile'
>;

/** The charger_command_status enum: queued and sent are in flight, the rest are final. */
export type CommandStatus =
  'queued' | 'sent' | 'accepted' | 'rejected' | 'timed_out' | 'expired' | 'failed';

/**
 * The rules every command follows, shared by the API (which accepts and queues commands)
 * and the gateway (which sends them). From the OCPP gateway design, "Commands".
 */
export class CommandCatalog {
  static readonly ACTIONS: CommandAction[] = [
    'remote_start',
    'remote_stop',
    'reset',
    'unlock',
    'change_availability',
    'set_charging_profile',
    'clear_charging_profile',
  ];

  /** The commands the portal's command endpoints accept. */
  static readonly STAFF_ACTIONS: StaffCommandAction[] = [
    'remote_start',
    'remote_stop',
    'reset',
    'unlock',
    'change_availability',
  ];

  /** Commands that may wait for an offline charger. A reset never waits: it fails at once. */
  static readonly QUEUEABLE: CommandAction[] = [
    'remote_start',
    'remote_stop',
    'unlock',
    'change_availability',
    'set_charging_profile',
    'clear_charging_profile',
  ];

  /** How long a queued command waits for the charger before it expires. */
  static readonly QUEUE_MINUTES = 5;

  /** How long the gateway waits for the charger's reply before the command times out. */
  static readonly REPLY_TIMEOUT_MS = 30_000;

  static readonly STATUSES: CommandStatus[] = [
    'queued',
    'sent',
    'accepted',
    'rejected',
    'timed_out',
    'expired',
    'failed',
  ];

  /** The OCPP 1.6 action each command becomes on the wire. */
  static readonly OCPP16_ACTIONS: Record<CommandAction, string> = {
    remote_start: 'RemoteStartTransaction',
    remote_stop: 'RemoteStopTransaction',
    reset: 'Reset',
    unlock: 'UnlockConnector',
    change_availability: 'ChangeAvailability',
    set_charging_profile: 'SetChargingProfile',
    clear_charging_profile: 'ClearChargingProfile',
  };

  /** The OCPP 2.0.1 action each command becomes on the wire (module 18). */
  static readonly OCPP201_ACTIONS: Record<CommandAction, string> = {
    remote_start: 'RequestStartTransaction',
    remote_stop: 'RequestStopTransaction',
    reset: 'Reset',
    unlock: 'UnlockConnector',
    change_availability: 'ChangeAvailability',
    set_charging_profile: 'SetChargingProfile',
    clear_charging_profile: 'ClearChargingProfile',
  };

  static isQueueable(action: CommandAction): boolean {
    return CommandCatalog.QUEUEABLE.includes(action);
  }

  static isFinal(status: CommandStatus): boolean {
    return status !== 'queued' && status !== 'sent';
  }
}
