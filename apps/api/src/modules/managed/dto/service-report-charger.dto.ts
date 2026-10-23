import { ApiProperty } from '@nestjs/swagger';
import { ChargerReportRow } from '../report/service-report-data';

/** One charger's month: sessions, energy, revenue, boots and faults. */
export class ServiceReportChargerDto {
  @ApiProperty()
  readonly charger_id: string;

  @ApiProperty({ example: 'CP-0001' })
  readonly ocpp_identity: string;

  @ApiProperty()
  readonly site_name: string;

  @ApiProperty({ description: 'Completed sessions that started in the month' })
  readonly sessions: number;

  @ApiProperty({ example: '1234.567', description: 'kWh, three decimals' })
  readonly energy_kwh: string;

  @ApiProperty({ description: 'Gross amount of the completed sessions, in minor units' })
  readonly revenue: number;

  @ApiProperty({ description: 'BootNotifications: how often the charger restarted' })
  readonly boots: number;

  @ApiProperty({ description: 'StatusNotifications that reported Faulted' })
  readonly faults: number;

  constructor(row: ChargerReportRow) {
    this.charger_id = row.chargerId;
    this.ocpp_identity = row.ocppIdentity;
    this.site_name = row.siteName;
    this.sessions = row.sessions;
    this.energy_kwh = (row.energyWh / 1000).toFixed(3);
    this.revenue = row.revenue;
    this.boots = row.boots;
    this.faults = row.faults;
  }
}
