import { ApiProperty } from '@nestjs/swagger';
import { StaffRecord } from '../platform-staff.repository';

/** One Wattwisely staff member and their console role. */
export class StaffMemberDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly user_account_id: string;

  @ApiProperty({ example: 'ana@wattwisely.test' })
  readonly email: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty({ enum: ['admin', 'billing', 'support', 'viewer'] })
  readonly role: string;

  @ApiProperty()
  readonly granted_at: string;

  @ApiProperty({ nullable: true })
  readonly removed_at: string | null;

  @ApiProperty({ description: 'Send as If-Match when changing or removing' })
  readonly version: number;

  constructor(record: StaffRecord) {
    this.id = record.id;
    this.user_account_id = record.userAccountId;
    this.email = record.email;
    this.name = record.name;
    this.role = record.role;
    this.granted_at = record.grantedAt.toISOString();
    this.removed_at = record.removedAt?.toISOString() ?? null;
    this.version = record.version;
  }
}
