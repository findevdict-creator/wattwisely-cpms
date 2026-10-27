import { ApiProperty } from '@nestjs/swagger';
import { LoadProfile } from '@wattwisely/load-management';
import { LoadChargerRecord, LoadPolicyRecord } from '../load-management-record';
import { LoadChargerDto } from './load-charger.dto';
import { LoadPolicyDto } from './load-policy.dto';

/** GET /v1/sites/{siteId}/load-management: the policy, every charger, and the totals. */
export class LoadManagementDto {
  @ApiProperty({ type: LoadPolicyDto })
  readonly policy: LoadPolicyDto;

  @ApiProperty({ type: [LoadChargerDto] })
  readonly chargers: LoadChargerDto[];

  @ApiProperty({ description: 'The caps handed out, in kW' })
  readonly allocated_kw: number;

  @ApiProperty({ description: 'Chargers with a car on them, as of the last round' })
  readonly charging_count: number;

  constructor(policy: LoadPolicyRecord, chargers: LoadChargerRecord[]) {
    this.policy = new LoadPolicyDto(policy);
    this.chargers = chargers.map((charger) => new LoadChargerDto(charger));
    const allocatedW = chargers.reduce(
      (sum, charger) => sum + (charger.allocation?.limitW ?? 0),
      0,
    );
    this.allocated_kw = LoadProfile.toKw(allocatedW);
    this.charging_count = chargers.filter((charger) => charger.allocation?.isCharging).length;
  }
}
