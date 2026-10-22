import { ApiProperty } from '@nestjs/swagger';
import { CommandAction, CommandCatalog, CommandStatus } from '@wattwisely/ocpp-contracts';
import { CommandRecord } from '../command-record';

/** A command as the command endpoints return it (API Design, "Charger commands"). */
export class CommandDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly charger_id: string;

  @ApiProperty({ enum: CommandCatalog.ACTIONS })
  readonly action: CommandAction;

  @ApiProperty({ description: 'What was sent, e.g. {"ocpp_connector_id": 1, "type": "Operative"}' })
  readonly payload: object;

  @ApiProperty({ enum: CommandCatalog.STATUSES })
  readonly status: CommandStatus;

  @ApiProperty({
    description: 'A queued command expires at this time if the charger stays offline',
  })
  readonly queued_until: string;

  @ApiProperty()
  readonly requested_by_label: string;

  @ApiProperty({ nullable: true, description: 'The charger’s reply, e.g. {"status": "Accepted"}' })
  readonly result: unknown;

  @ApiProperty({ nullable: true, description: 'Why the command did not succeed' })
  readonly error: string | null;

  @ApiProperty({ nullable: true })
  readonly sent_at: string | null;

  @ApiProperty({ nullable: true })
  readonly completed_at: string | null;

  @ApiProperty()
  readonly created_at: string;

  constructor(command: CommandRecord) {
    this.id = command.id;
    this.charger_id = command.chargerId;
    this.action = command.action;
    this.payload = command.payload;
    this.status = command.status;
    this.queued_until = command.queuedUntil.toISOString();
    this.requested_by_label = command.requestedByLabel;
    this.result = command.result;
    this.error = command.error;
    this.sent_at = command.sentAt?.toISOString() ?? null;
    this.completed_at = command.completedAt?.toISOString() ?? null;
    this.created_at = command.createdAt.toISOString();
  }
}
