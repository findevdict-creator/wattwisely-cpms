import { ApiProperty } from '@nestjs/swagger';
import { SessionStateChangeRecord } from '../session-record';

/** One step of a session's timeline: a state change and what caused it. */
export class SessionStateChangeDto {
  @ApiProperty({ nullable: true })
  readonly from_status: string | null;

  @ApiProperty()
  readonly to_status: string;

  @ApiProperty({ example: 'energy_stopped' })
  readonly event: string;

  @ApiProperty()
  readonly occurred_at: string;

  @ApiProperty({ type: Object })
  readonly details: Record<string, unknown>;

  constructor(change: SessionStateChangeRecord) {
    this.from_status = change.fromStatus;
    this.to_status = change.toStatus;
    this.event = change.event;
    this.occurred_at = change.occurredAt.toISOString();
    this.details = change.details;
  }
}
