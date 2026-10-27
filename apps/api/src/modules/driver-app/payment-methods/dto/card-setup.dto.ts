import { ApiProperty } from '@nestjs/swagger';

/** POST /v1/driver/payment-methods/setup: what the provider's card form needs to save a card. */
export class CardSetupDto {
  @ApiProperty({ description: 'Send it back as setup_id once the form confirmed the card' })
  readonly setup_id: string;

  @ApiProperty({ description: 'For the provider’s card form, on the platform account' })
  readonly client_secret: string;

  @ApiProperty({ nullable: true })
  readonly publishable_key: string | null;

  constructor(setupId: string, clientSecret: string, publishableKey: string | null) {
    this.setup_id = setupId;
    this.client_secret = clientSecret;
    this.publishable_key = publishableKey;
  }
}
