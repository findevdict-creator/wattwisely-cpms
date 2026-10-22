import { ApiProperty } from '@nestjs/swagger';

/** One point of a session's energy chart. */
export class SessionReadingDto {
  @ApiProperty()
  readonly at: string;

  @ApiProperty({ nullable: true, description: 'Energy delivered since the start, in Wh' })
  readonly energy_wh: number | null;

  @ApiProperty({ nullable: true })
  readonly power_w: number | null;

  @ApiProperty({ nullable: true })
  readonly soc_percent: number | null;

  constructor(point: {
    at: Date;
    energyWh: number | null;
    powerW: number | null;
    socPercent: number | null;
  }) {
    this.at = point.at.toISOString();
    this.energy_wh = point.energyWh;
    this.power_w = point.powerW;
    this.soc_percent = point.socPercent;
  }
}
