import { ApiProperty } from '@nestjs/swagger';
import { OpeningHours, SiteAddress } from '@wattwisely/db';
import { SiteHealth, SiteStatus } from '../site-health';
import { SiteSummary } from '../site-record';
import { OpeningHoursDto } from './opening-hours.dto';
import { SiteAddressDto } from './site-address.dto';

/** A site as GET /v1/sites and GET /v1/sites/{id} return it. */
export class SiteDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty({ type: SiteAddressDto })
  readonly address: SiteAddress;

  @ApiProperty()
  readonly latitude: number;

  @ApiProperty()
  readonly longitude: number;

  @ApiProperty({ example: 'Europe/London' })
  readonly time_zone: string;

  @ApiProperty({ type: OpeningHoursDto, nullable: true, description: 'null: open 24 hours a day' })
  readonly opening_hours: OpeningHours | null;

  @ApiProperty({ enum: ['public', 'private'] })
  readonly visibility: string;

  @ApiProperty({ nullable: true })
  readonly power_limit_kw: number | null;

  @ApiProperty()
  readonly parking_notes: string;

  @ApiProperty({ nullable: true, description: 'The tariff new sessions are priced with' })
  readonly tariff_id: string | null;

  @ApiProperty({ enum: ['ok', 'problem', 'offline'], description: 'How its chargers are doing' })
  readonly status: SiteStatus;

  @ApiProperty()
  readonly charger_count: number;

  @ApiProperty()
  readonly connector_count: number;

  @ApiProperty({ description: 'Connectors a driver could use right now' })
  readonly available_connector_count: number;

  @ApiProperty({ type: Object, example: { available: 3, charging: 2 } })
  readonly connector_counts: Record<string, number>;

  @ApiProperty({ description: 'Send back as If-Match when changing the site' })
  readonly version: number;

  @ApiProperty()
  readonly created_at: string;

  @ApiProperty()
  readonly updated_at: string;

  constructor(site: SiteSummary) {
    this.id = site.id;
    this.name = site.name;
    this.address = site.address;
    this.latitude = site.latitude;
    this.longitude = site.longitude;
    this.time_zone = site.timeZone;
    this.opening_hours = site.openingHours;
    this.visibility = site.visibility;
    this.power_limit_kw = site.powerLimitKw;
    this.parking_notes = site.parkingNotes;
    this.tariff_id = site.tariffId;
    this.status = SiteHealth.statusOf(site.fleet);
    this.charger_count = site.fleet.chargerCount;
    this.connector_count = SiteHealth.connectorCount(site.fleet);
    this.available_connector_count = SiteHealth.availableConnectors(site.fleet);
    this.connector_counts = site.fleet.connectorStatuses;
    this.version = site.version;
    this.created_at = site.createdAt.toISOString();
    this.updated_at = site.updatedAt.toISOString();
  }
}
