import { ApiProperty } from '@nestjs/swagger';
import { ManagedOperatorRecord, ManagedServiceRecord } from '../managed-service-record';
import { AccountManagerDto } from './account-manager.dto';
import { ManagedOperatorDto } from './managed-operator.dto';

/**
 * A managed service agreement as the portal (Settings, Managed service) and the admin
 * console show it. Staff notes are only in the admin console's answer.
 */
export class ManagedServiceDto {
  static readonly STATUSES = ['pending_acceptance', 'active', 'ending', 'ended', 'withdrawn'];

  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly tenant_id: string;

  @ApiProperty({ enum: ManagedServiceDto.STATUSES })
  readonly status: string;

  @ApiProperty({ type: AccountManagerDto, nullable: true })
  readonly account_manager: AccountManagerDto | null;

  @ApiProperty({ description: "A Managed operator's tariff change waits for the Owner" })
  readonly is_tariff_approval_required: boolean;

  @ApiProperty({ description: "The contract's reference" })
  readonly agreement_reference: string;

  @ApiProperty({ nullable: true, description: 'Staff notes; only in the admin console' })
  readonly notes: string | null;

  @ApiProperty()
  readonly offered_at: string;

  @ApiProperty({ nullable: true })
  readonly accepted_at: string | null;

  @ApiProperty({ nullable: true })
  readonly notice_given_at: string | null;

  @ApiProperty({ nullable: true, description: 'When the service ends, once notice is given' })
  readonly ends_at: string | null;

  @ApiProperty({ nullable: true })
  readonly ended_at: string | null;

  @ApiProperty({ type: [ManagedOperatorDto], description: 'Staff working in the tenant now' })
  readonly operators: ManagedOperatorDto[];

  @ApiProperty({ description: 'Send as If-Match when changing the agreement' })
  readonly version: number;

  constructor(
    record: ManagedServiceRecord,
    operators: ManagedOperatorRecord[],
    options: { isStaffView: boolean },
  ) {
    this.id = record.id;
    this.tenant_id = record.tenantId;
    this.status = record.status;
    this.account_manager = record.accountManager
      ? new AccountManagerDto(record.accountManager)
      : null;
    this.is_tariff_approval_required = record.isTariffApprovalRequired;
    this.agreement_reference = record.agreementReference;
    this.notes = options.isStaffView ? record.notes : null;
    this.offered_at = record.offeredAt.toISOString();
    this.accepted_at = ManagedServiceDto.iso(record.acceptedAt);
    this.notice_given_at = ManagedServiceDto.iso(record.noticeGivenAt);
    this.ends_at = ManagedServiceDto.iso(record.endsAt);
    this.ended_at = ManagedServiceDto.iso(record.endedAt);
    this.operators = operators.map((operator) => new ManagedOperatorDto(operator));
    this.version = record.version;
  }

  private static iso(date: Date | null): string | null {
    return date ? date.toISOString() : null;
  }
}
