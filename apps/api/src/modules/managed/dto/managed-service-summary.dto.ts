import { ApiProperty } from '@nestjs/swagger';
import { ManagedServiceRecord } from '../managed-service-record';

/**
 * What every member's GET /v1/me/permissions says about the managed service, so the portal
 * can show the "Managed by Wattwisely" badge, the acceptance banner and the approval flow.
 */
export class ManagedServiceSummaryDto {
  @ApiProperty({ enum: ['pending_acceptance', 'active', 'ending'] })
  readonly status: string;

  @ApiProperty({
    description: 'True for Wattwisely staff working in the tenant as its Managed operator',
  })
  readonly is_operator: boolean;

  @ApiProperty({ description: 'Tariff changes by the Managed operator wait for the Owner' })
  readonly is_tariff_approval_required: boolean;

  @ApiProperty({ nullable: true })
  readonly account_manager_name: string | null;

  @ApiProperty({ nullable: true })
  readonly ends_at: string | null;

  constructor(record: ManagedServiceRecord, isOperator: boolean) {
    this.status = record.status;
    this.is_operator = isOperator;
    this.is_tariff_approval_required = record.isTariffApprovalRequired;
    this.account_manager_name = record.accountManager?.name || record.accountManager?.email || null;
    this.ends_at = record.endsAt?.toISOString() ?? null;
  }
}
