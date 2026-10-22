import { ApiProperty } from '@nestjs/swagger';

/** A one-time link into Stripe: onboarding or the Express dashboard. Open it right away; it expires. */
export class AccountLinkDto {
  @ApiProperty({ example: 'https://connect.stripe.com/setup/e/acct_…/…' })
  readonly url: string;

  constructor(url: string) {
    this.url = url;
  }
}
