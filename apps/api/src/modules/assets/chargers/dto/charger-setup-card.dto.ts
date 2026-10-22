import { ApiProperty } from '@nestjs/swagger';

/**
 * What to type into a charger so it connects (story AST-02). The password appears here once,
 * right after it is set; it is never shown again.
 */
export class ChargerSetupCardDto {
  @ApiProperty({ example: 'wss://ocpp.example.com/ocpp/WW-7KQ4M2XR9T' })
  readonly ocpp_url: string;

  @ApiProperty({ nullable: true, description: 'Only when the charger may connect without TLS' })
  readonly ocpp_plain_url: string | null;

  @ApiProperty({ example: 'WW-7KQ4M2XR9T' })
  readonly identity: string;

  @ApiProperty({ nullable: true, description: 'The HTTP Basic password, shown this once' })
  readonly password: string | null;

  constructor(card: {
    ocppUrl: string;
    ocppPlainUrl: string | null;
    identity: string;
    password: string | null;
  }) {
    this.ocpp_url = card.ocppUrl;
    this.ocpp_plain_url = card.ocppPlainUrl;
    this.identity = card.identity;
    this.password = card.password;
  }
}
