import { ApiProperty } from '@nestjs/swagger';
import { MemberDto } from './member.dto';

/** Answer to sending or resending an invitation. */
export class InviteResultDto {
  @ApiProperty({ type: MemberDto })
  readonly member: MemberDto;

  @ApiProperty({ description: 'False if the e-mail server refused the message; resend later' })
  readonly is_email_sent: boolean;

  constructor(member: MemberDto, isEmailSent: boolean) {
    this.member = member;
    this.is_email_sent = isEmailSent;
  }
}
