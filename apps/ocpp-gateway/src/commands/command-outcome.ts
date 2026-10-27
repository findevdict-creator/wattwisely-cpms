import { CommandStatus } from '@wattwisely/ocpp-contracts';

/** The outcome of a command as charger_commands records it. */
export interface CommandOutcome {
  status: CommandStatus;
  result: unknown;
  error: string | null;
}
