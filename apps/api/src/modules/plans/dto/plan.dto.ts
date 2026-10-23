import { ApiProperty } from '@nestjs/swagger';
import { PlanRecord } from '../plan-record';

/** One plan: its monthly fees in minor units of `currency`, its limits and its modules. */
export class PlanDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ example: 'growth' })
  readonly code: string;

  @ApiProperty({ example: 'Growth' })
  readonly name: string;

  @ApiProperty()
  readonly description: string;

  @ApiProperty({ example: 'USD' })
  readonly currency: string;

  @ApiProperty({ example: 29900, description: 'Per month, in minor units' })
  readonly platform_fee: number;

  @ApiProperty({ example: 1000, description: 'Per AC connector per month, in minor units' })
  readonly ac_connector_fee: number;

  @ApiProperty({ example: 1600, description: 'Per DC connector per month, in minor units' })
  readonly dc_connector_fee: number;

  @ApiProperty({ example: 0, description: 'Share of charging revenue, in basis points' })
  readonly revenue_share_bps: number;

  @ApiProperty({ nullable: true, example: 500, description: 'Null means unlimited' })
  readonly connector_limit: number | null;

  @ApiProperty({ nullable: true, example: null, description: 'Null means unlimited' })
  readonly user_limit: number | null;

  @ApiProperty({ type: [String], example: ['advanced_reports', 'custom_roles', 'api_keys'] })
  readonly module_keys: string[];

  @ApiProperty({ description: 'Inactive plans are kept for the tenants on them but not sold' })
  readonly is_active: boolean;

  @ApiProperty()
  readonly sort_order: number;

  @ApiProperty()
  readonly version: number;

  @ApiProperty({ required: false, description: 'Tenants on this plan; admin console only' })
  readonly tenant_count?: number;

  constructor(record: PlanRecord, tenantCount?: number) {
    this.id = record.id;
    this.code = record.code;
    this.name = record.name;
    this.description = record.description;
    this.currency = record.currency;
    this.platform_fee = record.platformFee;
    this.ac_connector_fee = record.acConnectorFee;
    this.dc_connector_fee = record.dcConnectorFee;
    this.revenue_share_bps = record.revenueShareBps;
    this.connector_limit = record.connectorLimit;
    this.user_limit = record.userLimit;
    this.module_keys = [...record.moduleKeys];
    this.is_active = record.isActive;
    this.sort_order = record.sortOrder;
    this.version = record.version;
    if (tenantCount !== undefined) {
      this.tenant_count = tenantCount;
    }
  }
}
