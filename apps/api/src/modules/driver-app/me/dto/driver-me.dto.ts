import { ApiProperty } from '@nestjs/swagger';
import { DriverAccount } from '../../../../common/account/driver-account';

/** GET /v1/driver/me: the driver's own account (module 19). */
export class DriverMeDto {
  @ApiProperty() readonly id: string;
  @ApiProperty({ example: 'dana@example.com' }) readonly email: string;
  @ApiProperty({ description: 'The name the driver goes by in the app' })
  readonly display_name: string;
  @ApiProperty({ nullable: true, type: String }) readonly phone: string | null;

  constructor(account: DriverAccount) {
    this.id = account.id;
    this.email = account.email;
    this.display_name = account.displayName;
    this.phone = account.phone;
  }
}
