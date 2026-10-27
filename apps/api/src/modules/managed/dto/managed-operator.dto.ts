import { ApiProperty } from '@nestjs/swagger';
import { ManagedOperatorRecord } from '../managed-service-record';

/** A Wattwisely staff member working in the tenant as its Managed operator. */
export class ManagedOperatorDto {
  @ApiProperty({ description: 'The assignment id' })
  readonly id: string;

  @ApiProperty({
    nullable: true,
    description: 'Their platform_staff id; null once they left Wattwisely',
  })
  readonly staff_id: string | null;

  @ApiProperty()
  readonly user_account_id: string;

  @ApiProperty({ description: 'The tenant membership that carries the Managed operator role' })
  readonly member_id: string;

  @ApiProperty()
  readonly email: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly assigned_at: string;

  constructor(record: ManagedOperatorRecord) {
    this.id = record.id;
    this.staff_id = record.staffId;
    this.user_account_id = record.userAccountId;
    this.member_id = record.membershipId;
    this.email = record.email;
    this.name = record.name;
    this.assigned_at = record.assignedAt.toISOString();
  }
}
