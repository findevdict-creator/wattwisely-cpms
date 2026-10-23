import { ApiProperty } from '@nestjs/swagger';
import { AuditLogRecord } from '../audit-log-record';

/** One audit log entry. The list leaves out before and after; GET /audit-log/{id} includes them. */
export class AuditLogEntryDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly occurred_at: string;

  @ApiProperty({ enum: ['user', 'api_key', 'support', 'system', 'platform'] })
  readonly actor_type: string;

  @ApiProperty({ nullable: true })
  readonly actor_id: string | null;

  @ApiProperty({ example: 'Olivia Owner <owner@acme.test>' })
  readonly actor_label: string;

  @ApiProperty({ example: 'team.member_invited' })
  readonly action: string;

  @ApiProperty({ example: 'member' })
  readonly target_type: string;

  @ApiProperty({ nullable: true })
  readonly target_id: string | null;

  @ApiProperty({ nullable: true, example: 'tom@acme.example' })
  readonly target_label: string | null;

  @ApiProperty({ required: false, nullable: true, type: Object })
  readonly before?: unknown;

  @ApiProperty({ required: false, nullable: true, type: Object })
  readonly after?: unknown;

  @ApiProperty({ nullable: true })
  readonly ip: string | null;

  @ApiProperty({ nullable: true })
  readonly request_id: string | null;

  constructor(record: AuditLogRecord, hasChanges: boolean) {
    this.id = record.id;
    this.occurred_at = record.occurredAt.toISOString();
    this.actor_type = record.actorType;
    this.actor_id = record.actorId;
    this.actor_label = record.actorLabel;
    this.action = record.action;
    this.target_type = record.targetType;
    this.target_id = record.targetId;
    this.target_label = record.targetLabel;
    if (hasChanges) {
      this.before = record.before;
      this.after = record.after;
    }
    this.ip = record.ip;
    this.request_id = record.requestId;
  }
}
