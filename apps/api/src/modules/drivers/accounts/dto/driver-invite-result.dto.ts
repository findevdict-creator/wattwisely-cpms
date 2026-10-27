import { ApiProperty } from '@nestjs/swagger';
import { DriverDetailDto } from '../../profiles/dto/driver-detail.dto';

/** Answer to inviting a driver to the app, or resending the invitation. */
export class DriverInviteResultDto {
  @ApiProperty({ type: DriverDetailDto })
  readonly driver: DriverDetailDto;

  @ApiProperty({ description: 'False if the e-mail server refused the message; resend later' })
  readonly is_email_sent: boolean;

  constructor(driver: DriverDetailDto, isEmailSent: boolean) {
    this.driver = driver;
    this.is_email_sent = isEmailSent;
  }
}
