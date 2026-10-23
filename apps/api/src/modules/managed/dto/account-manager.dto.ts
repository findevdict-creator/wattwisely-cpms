import { ApiProperty } from '@nestjs/swagger';

/** The Wattwisely staff member a managed tenant can turn to. */
export class AccountManagerDto {
  @ApiProperty({ description: 'Their platform_staff id' })
  readonly staff_id: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly email: string;

  constructor(manager: { staffId: string; name: string; email: string }) {
    this.staff_id = manager.staffId;
    this.name = manager.name;
    this.email = manager.email;
  }
}
