import { ApiProperty } from '@nestjs/swagger';
import { PlanUsageDto } from '../../../subscription/dto/plan-usage.dto';
import { AdminTenantRecord } from '../admin-tenant-record';
import { TenantPlanRefDto } from './tenant-plan-ref.dto';

/** One tenant in the admin console's list (story ADM-04). */
export class AdminTenantSummaryDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ example: 'acme-charging' })
  readonly slug: string;

  @ApiProperty({ example: 'Acme Charging' })
  readonly name: string;

  @ApiProperty({ enum: ['trial', 'active', 'suspended', 'cancelled'] })
  readonly status: string;

  @ApiProperty({ nullable: true, example: 'DE' })
  readonly region: string | null;

  @ApiProperty({ type: TenantPlanRefDto, nullable: true })
  readonly plan: TenantPlanRefDto | null;

  @ApiProperty({ enum: ['trialing', 'active', 'past_due', 'cancelled'], nullable: true })
  readonly subscription_status: string | null;

  @ApiProperty({ type: PlanUsageDto })
  readonly usage: PlanUsageDto;

  @ApiProperty()
  readonly created_at: string;

  @ApiProperty({ nullable: true })
  readonly suspended_at: string | null;

  @ApiProperty({ nullable: true })
  readonly deleted_at: string | null;

  constructor(record: AdminTenantRecord) {
    this.id = record.tenant.id;
    this.slug = record.tenant.slug;
    this.name = record.tenant.name;
    this.status = record.tenant.status;
    this.region = record.tenant.region;
    this.plan = record.plan ? new TenantPlanRefDto(record.plan) : null;
    this.subscription_status = record.subscriptionStatus;
    this.usage = new PlanUsageDto(record.overview, null);
    this.created_at = record.tenant.createdAt.toISOString();
    this.suspended_at = record.tenant.suspendedAt?.toISOString() ?? null;
    this.deleted_at = record.tenant.deletedAt?.toISOString() ?? null;
  }
}
