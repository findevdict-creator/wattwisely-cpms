import { ApiProperty } from '@nestjs/swagger';
import { LoadPolicyRecord } from '../load-management-record';

/** A site's load policy. Version 0 means none has been saved yet; send it back as If-Match. */
export class LoadPolicyDto {
  @ApiProperty({ description: 'False leaves the chargers uncapped' })
  readonly is_enabled: boolean;

  @ApiProperty({ example: 100, description: 'The most the site may draw, in kW' })
  readonly limit_kw: number;

  @ApiProperty({ enum: ['equal_share', 'priority'] })
  readonly strategy: 'equal_share' | 'priority';

  @ApiProperty({ example: 4.2, description: 'What a charging charger always gets, in kW' })
  readonly min_power_kw: number;

  @ApiProperty({ description: '0 until the policy is first saved' })
  readonly version: number;

  @ApiProperty({ nullable: true })
  readonly updated_at: string | null;

  constructor(record: LoadPolicyRecord) {
    this.is_enabled = record.isEnabled;
    this.limit_kw = record.limitKw;
    this.strategy = record.strategy;
    this.min_power_kw = record.minPowerKw;
    this.version = record.version;
    this.updated_at = record.updatedAt?.toISOString() ?? null;
  }
}
