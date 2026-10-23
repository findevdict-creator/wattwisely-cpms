import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionDto } from '../../../subscription/dto/subscription.dto';
import { AdminTenantRecord } from '../admin-tenant-record';
import { TenantDeletionPolicy } from '../tenant-deletion.policy';
import { TenantOwnerDto } from './tenant-owner.dto';
import { TenantPlanRefDto } from './tenant-plan-ref.dto';

/** One tenant in full, for the admin console's tenant page. */
export class AdminTenantDto {
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

  @ApiProperty({ enum: ['direct', 'managed'] })
  readonly payment_mode: string;

  @ApiProperty({ type: TenantPlanRefDto, nullable: true })
  readonly plan: TenantPlanRefDto | null;

  @ApiProperty({ type: SubscriptionDto })
  readonly subscription: SubscriptionDto;

  @ApiProperty({ type: [TenantOwnerDto] })
  readonly owners: TenantOwnerDto[];

  @ApiProperty()
  readonly created_at: string;

  @ApiProperty({ nullable: true })
  readonly suspended_at: string | null;

  @ApiProperty({ nullable: true, description: 'A suspended tenant can be deleted from this date' })
  readonly can_delete_from: string | null;

  @ApiProperty({ nullable: true })
  readonly deleted_at: string | null;

  @ApiProperty({ description: 'Send as If-Match when changing the tenant' })
  readonly version: number;

  constructor(record: AdminTenantRecord, subscription: SubscriptionDto, owners: TenantOwnerDto[]) {
    const tenant = record.tenant;
    this.id = tenant.id;
    this.slug = tenant.slug;
    this.name = tenant.name;
    this.status = tenant.status;
    this.region = tenant.region;
    this.payment_mode = tenant.paymentMode;
    this.plan = record.plan ? new TenantPlanRefDto(record.plan) : null;
    this.subscription = subscription;
    this.owners = owners;
    this.created_at = tenant.createdAt.toISOString();
    this.suspended_at = tenant.suspendedAt?.toISOString() ?? null;
    this.can_delete_from = TenantDeletionPolicy.allowedFrom(tenant)?.toISOString() ?? null;
    this.deleted_at = tenant.deletedAt?.toISOString() ?? null;
    this.version = tenant.version;
  }
}
