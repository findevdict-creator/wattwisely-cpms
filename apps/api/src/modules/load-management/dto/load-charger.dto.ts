import { ApiProperty } from '@nestjs/swagger';
import { LoadProfile } from '@wattwisely/load-management';
import { LoadChargerRecord } from '../load-management-record';

/** A charger at the site: its load settings and the cap it holds right now. */
export class LoadChargerDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ example: 'WW-7KQ4M2XR9T' })
  readonly identity: string;

  @ApiProperty({ example: 'charging' })
  readonly status: string;

  @ApiProperty()
  readonly is_online: boolean;

  @ApiProperty({ example: 5, description: '10 is served first, 1 last' })
  readonly priority: number;

  @ApiProperty({
    nullable: true,
    description: 'The ceiling staff set in kW; null uses the connectors’ total',
  })
  readonly max_power_kw: number | null;

  @ApiProperty({ nullable: true, description: 'The connectors’ total in kW, when they report one' })
  readonly connectors_max_kw: number | null;

  @ApiProperty({ nullable: true, description: 'The cap the platform wants on the charger, in kW' })
  readonly allocated_kw: number | null;

  @ApiProperty({ nullable: true, enum: ['share', 'minimum', 'idle', 'waiting', 'squeezed'] })
  readonly reason: string | null;

  @ApiProperty({ description: 'A car is on the charger, as of the last round' })
  readonly is_charging: boolean;

  @ApiProperty({ description: 'The charger accepted the cap' })
  readonly is_applied: boolean;

  @ApiProperty({ nullable: true })
  readonly applied_at: string | null;

  @ApiProperty({ nullable: true, description: 'Why the last attempt to set the cap failed' })
  readonly last_error: string | null;

  constructor(record: LoadChargerRecord) {
    this.id = record.id;
    this.identity = record.identity;
    this.status = record.status;
    this.is_online = record.isOnline;
    this.priority = record.priority;
    this.max_power_kw = record.maxPowerKw;
    this.connectors_max_kw = record.connectorsMaxKw;
    const allocation = record.allocation ?? LoadChargerDto.NONE;
    this.allocated_kw = record.allocation ? LoadProfile.toKw(allocation.limitW) : null;
    this.reason = record.allocation ? allocation.reason : null;
    this.is_charging = allocation.isCharging;
    this.is_applied = allocation.isApplied;
    this.applied_at = allocation.appliedAt ? new Date(allocation.appliedAt).toISOString() : null;
    this.last_error = allocation.lastError;
  }

  /** What a charger without an allocation row shows. */
  private static readonly NONE: NonNullable<LoadChargerRecord['allocation']> = {
    limitW: 0,
    reason: 'waiting',
    isCharging: false,
    isApplied: false,
    appliedAt: null,
    lastError: null,
  };
}
