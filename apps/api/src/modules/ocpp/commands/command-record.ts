import { CommandAction, CommandPayload, CommandStatus } from '@wattwisely/ocpp-contracts';

/** One charger_commands row as the repository returns it. */
export interface CommandRecord {
  id: string;
  chargerId: string;
  action: CommandAction;
  payload: CommandPayload;
  status: CommandStatus;
  queuedUntil: Date;
  requestedBy: string | null;
  requestedByLabel: string;
  result: unknown;
  error: string | null;
  sentAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
