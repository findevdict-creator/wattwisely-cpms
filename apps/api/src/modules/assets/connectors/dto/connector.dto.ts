import { ApiProperty } from '@nestjs/swagger';
import { ConnectorRecord } from '../connector-record';
import { ActiveSessionDto } from './active-session.dto';

/** A connector as the API returns it, inside a charger or from the connector endpoints. */
export class ConnectorDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly charger_id: string;

  @ApiProperty({ description: 'The connectorId the charger uses in OCPP messages, from 1' })
  readonly ocpp_connector_id: number;

  @ApiProperty({ nullable: true, description: 'OCPP 2.0.1 EVSE number, when known' })
  readonly evse_id: number | null;

  @ApiProperty({ enum: ['ccs1', 'ccs2', 'type1', 'type2', 'chademo', 'gbt', 'nacs', 'unknown'] })
  readonly type: string;

  @ApiProperty({ enum: ['ac', 'dc'], nullable: true })
  readonly current_type: string | null;

  @ApiProperty({ nullable: true })
  readonly max_power_kw: number | null;

  @ApiProperty({ example: 'A', description: 'What drivers see on the charger' })
  readonly label: string;

  @ApiProperty({ description: 'Last status the charger reported; unknown until it does' })
  readonly status: string;

  @ApiProperty({ nullable: true })
  readonly error_code: string | null;

  @ApiProperty({ nullable: true })
  readonly status_info: string | null;

  @ApiProperty({ nullable: true })
  readonly status_changed_at: string | null;

  @ApiProperty({ description: 'Send back as If-Match when changing the connector' })
  readonly version: number;

  @ApiProperty({ type: ActiveSessionDto, nullable: true, description: 'The charge running now' })
  readonly active_session: ActiveSessionDto | null;

  constructor(connector: ConnectorRecord) {
    this.id = connector.id;
    this.charger_id = connector.chargerId;
    this.ocpp_connector_id = connector.ocppConnectorId;
    this.evse_id = connector.evseId;
    this.type = connector.type;
    this.current_type = connector.currentType;
    this.max_power_kw = connector.maxPowerKw;
    this.label = connector.label;
    this.status = connector.status;
    this.error_code = connector.errorCode;
    this.status_info = connector.statusInfo;
    this.status_changed_at = connector.statusChangedAt?.toISOString() ?? null;
    this.version = connector.version;
    this.active_session = connector.activeSession
      ? new ActiveSessionDto(connector.activeSession)
      : null;
  }
}
