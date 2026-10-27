import { ApiProperty } from '@nestjs/swagger';
import { PlanDto } from '../../plans/dto/plan.dto';
import { TenantModuleDto } from '../../plans/dto/tenant-module.dto';
import { SubscriptionRecord } from '../subscriptions.repository';
import { PlanUsageDto } from './plan-usage.dto';

/** What a subscription answer is built from. */
export interface SubscriptionView {
  record: SubscriptionRecord | null;
  usage: PlanUsageDto;
  modules: TenantModuleDto[];
  /** Staff notes are included for the admin console only. */
  hasNotes: boolean;
}

/**
 * Body of GET /v1/subscription (the tenant's Plan page) and the plan part of a tenant in
 * the admin console: the plan, its state, the billing contact, usage and every module.
 */
export class SubscriptionDto {
  @ApiProperty({ type: PlanDto, nullable: true, description: 'Null until Wattwisely sets a plan' })
  readonly plan: PlanDto | null;

  @ApiProperty({ enum: ['trialing', 'active', 'past_due', 'cancelled'], nullable: true })
  readonly status: string | null;

  @ApiProperty({ nullable: true })
  readonly started_at: string | null;

  @ApiProperty({ nullable: true })
  readonly trial_ends_at: string | null;

  @ApiProperty({ nullable: true })
  readonly billing_email: string | null;

  @ApiProperty({ nullable: true })
  readonly billing_name: string | null;

  @ApiProperty({ nullable: true, description: 'VAT or purchase order number on invoices' })
  readonly billing_reference: string | null;

  @ApiProperty({ required: false, description: 'Staff notes; admin console only' })
  readonly notes?: string;

  @ApiProperty({ nullable: true, description: 'Send as If-Match when changing the plan' })
  readonly version: number | null;

  @ApiProperty({ type: PlanUsageDto })
  readonly usage: PlanUsageDto;

  @ApiProperty({ type: [TenantModuleDto] })
  readonly modules: TenantModuleDto[];

  constructor(view: SubscriptionView) {
    const row = SubscriptionDto.rowOf(view.record);
    this.plan = view.record ? new PlanDto(view.record.plan) : null;
    this.status = row.status;
    this.started_at = SubscriptionDto.iso(row.startedAt);
    this.trial_ends_at = SubscriptionDto.iso(row.trialEndsAt);
    this.billing_email = row.billingEmail;
    this.billing_name = row.billingName;
    this.billing_reference = row.billingReference;
    if (view.hasNotes) {
      this.notes = row.notes;
    }
    this.version = row.version;
    this.usage = view.usage;
    this.modules = view.modules;
  }

  /** The row's fields, or empty ones for a tenant without a plan. */
  private static rowOf(record: SubscriptionRecord | null): SubscriptionFields {
    return (
      record?.subscription ?? {
        status: null,
        startedAt: null,
        trialEndsAt: null,
        billingEmail: null,
        billingName: null,
        billingReference: null,
        notes: '',
        version: null,
      }
    );
  }

  private static iso(date: Date | null): string | null {
    return date ? date.toISOString() : null;
  }
}

/** The subscription columns the answer shows; every one may be empty. */
interface SubscriptionFields {
  status: string | null;
  startedAt: Date | null;
  trialEndsAt: Date | null;
  billingEmail: string | null;
  billingName: string | null;
  billingReference: string | null;
  notes: string;
  version: number | null;
}
