import { ApiProperty } from '@nestjs/swagger';
import { AlertRecord } from '../alert-record';
import { AlertTypes } from '../alert-types';

/** An alert as the API returns it (story NTF-04). */
export class AlertDto {
  @ApiProperty() readonly id: string;
  @ApiProperty({ enum: AlertTypes.ALL }) readonly type: string;
  @ApiProperty({ enum: AlertTypes.STATUSES }) readonly status: string;
  @ApiProperty({ example: 'CP-1 is offline' }) readonly title: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) readonly details: Record<
    string,
    unknown
  >;
  @ApiProperty() readonly site_id: string;
  @ApiProperty() readonly site_name: string;
  @ApiProperty() readonly charger_id: string;
  @ApiProperty() readonly charger_identity: string;
  @ApiProperty({ nullable: true, type: String }) readonly connector_id: string | null;
  @ApiProperty({ nullable: true, type: String }) readonly session_id: string | null;
  @ApiProperty({ description: 'When the problem began, often before the alert opened' })
  readonly began_at: string;
  @ApiProperty() readonly opened_at: string;
  @ApiProperty({ description: 'The last time the worker saw the problem' })
  readonly last_seen_at: string;
  @ApiProperty({ description: 'How often it came back soon after clearing' })
  readonly occurrences: number;
  @ApiProperty({ nullable: true, type: String }) readonly acknowledged_by: string | null;
  @ApiProperty({ nullable: true, type: String }) readonly acknowledged_at: string | null;
  @ApiProperty() readonly acknowledge_note: string;
  @ApiProperty({ nullable: true, type: String }) readonly closed_at: string | null;
  @ApiProperty({ nullable: true, type: String, example: 'cleared' })
  readonly close_reason: string | null;
  @ApiProperty() readonly version: number;

  constructor(alert: AlertRecord) {
    this.id = alert.id;
    this.type = alert.type;
    this.status = alert.status;
    this.title = alert.title;
    this.details = alert.details;
    this.site_id = alert.siteId;
    this.site_name = alert.siteName;
    this.charger_id = alert.chargerId;
    this.charger_identity = alert.chargerIdentity;
    this.connector_id = alert.connectorId;
    this.session_id = alert.sessionId;
    this.began_at = alert.beganAt.toISOString();
    this.opened_at = alert.openedAt.toISOString();
    this.last_seen_at = alert.lastSeenAt.toISOString();
    this.occurrences = alert.occurrences;
    this.acknowledged_by = alert.acknowledgedByName;
    this.acknowledged_at = alert.acknowledgedAt?.toISOString() ?? null;
    this.acknowledge_note = alert.acknowledgeNote;
    this.closed_at = alert.closedAt?.toISOString() ?? null;
    this.close_reason = alert.closeReason;
    this.version = alert.version;
  }
}
