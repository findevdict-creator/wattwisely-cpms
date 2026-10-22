import { ApiProperty } from '@nestjs/swagger';
import { BootFingerprint } from '@wattwisely/db';
import { ConnectorDto } from '../../connectors/dto/connector.dto';
import { ChargerDetail } from '../charger-record';
import { ChargerStatus, ChargerStatusSql } from '../charger-status';

/** A charger as GET /v1/chargers and GET /v1/chargers/{id} return it. */
export class ChargerDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly site_id: string;

  @ApiProperty()
  readonly site_name: string;

  @ApiProperty({
    example: 'WW-7KQ4M2XR9T',
    description: 'The charge point identity in the OCPP URL',
  })
  readonly ocpp_identity: string;

  @ApiProperty({ nullable: true })
  readonly vendor: string | null;

  @ApiProperty({ nullable: true })
  readonly model: string | null;

  @ApiProperty({ enum: ['password', 'none'] })
  readonly auth_mode: string;

  @ApiProperty({ description: 'May connect over plain ws:// as well as wss://' })
  readonly allow_plain_ws: boolean;

  @ApiProperty({
    enum: ['public', 'private'],
    nullable: true,
    description: 'null: same as the site',
  })
  readonly visibility_override: string | null;

  @ApiProperty({
    enum: ['public', 'private'],
    description: 'What applies: the override or the site',
  })
  readonly visibility: string;

  @ApiProperty({ enum: ChargerStatusSql.VALUES })
  readonly status: ChargerStatus;

  @ApiProperty({ description: 'A gateway holds the charger’s socket right now' })
  readonly is_online: boolean;

  @ApiProperty({ nullable: true, description: 'When the current connection was made' })
  readonly connected_at: string | null;

  @ApiProperty({ enum: ['1.6', '2.0.1'], nullable: true, description: 'Learned when it connects' })
  readonly ocpp_version: string | null;

  @ApiProperty({ nullable: true })
  readonly charge_point_serial: string | null;

  @ApiProperty({ nullable: true })
  readonly charge_box_serial: string | null;

  @ApiProperty({ nullable: true })
  readonly firmware_version: string | null;

  @ApiProperty({
    nullable: true,
    description: 'What the charger said about itself at its first boot',
  })
  readonly boot_fingerprint: BootFingerprint | null;

  @ApiProperty({ enum: ['accepted', 'pending', 'rejected'], nullable: true })
  readonly registration_status: string | null;

  @ApiProperty({ nullable: true })
  readonly last_boot_at: string | null;

  @ApiProperty({ nullable: true })
  readonly last_seen_at: string | null;

  @ApiProperty({ type: [ConnectorDto] })
  readonly connectors: ConnectorDto[];

  @ApiProperty({ description: 'Send back as If-Match when changing the charger' })
  readonly version: number;

  @ApiProperty()
  readonly created_at: string;

  @ApiProperty()
  readonly updated_at: string;

  constructor(charger: ChargerDetail) {
    this.id = charger.id;
    this.site_id = charger.siteId;
    this.site_name = charger.siteName;
    this.ocpp_identity = charger.ocppIdentity;
    this.vendor = charger.vendor;
    this.model = charger.model;
    this.auth_mode = charger.authMode;
    this.allow_plain_ws = charger.allowPlainWs;
    this.visibility_override = charger.visibilityOverride;
    this.visibility = charger.visibilityOverride ?? charger.siteVisibility;
    this.status = charger.status;
    this.is_online = charger.isOnline;
    this.connected_at = charger.connectedAt?.toISOString() ?? null;
    this.ocpp_version = charger.ocppVersion;
    this.charge_point_serial = charger.chargePointSerial;
    this.charge_box_serial = charger.chargeBoxSerial;
    this.firmware_version = charger.firmwareVersion;
    this.boot_fingerprint = charger.bootFingerprint;
    this.registration_status = charger.registrationStatus;
    this.last_boot_at = charger.lastBootAt?.toISOString() ?? null;
    this.last_seen_at = charger.lastSeenAt?.toISOString() ?? null;
    this.connectors = charger.connectors.map((connector) => new ConnectorDto(connector));
    this.version = charger.version;
    this.created_at = charger.createdAt.toISOString();
    this.updated_at = charger.updatedAt.toISOString();
  }
}
