import { ApiProperty } from '@nestjs/swagger';
import { PaymentRecord } from '../payment-record';

/** Where a payment's session happened and how it is going, as the payments list shows it. */
export class PaymentPlaceDto {
  @ApiProperty()
  readonly site_id: string;

  @ApiProperty()
  readonly site_name: string;

  @ApiProperty()
  readonly charger_id: string;

  @ApiProperty()
  readonly charger_identity: string;

  @ApiProperty()
  readonly connector_label: string;

  @ApiProperty()
  readonly session_status: string;

  @ApiProperty({ nullable: true, description: 'The session’s price, or its cost so far' })
  readonly session_gross_amount: number | null;

  @ApiProperty()
  readonly energy_wh: number;

  constructor(payment: PaymentRecord) {
    this.site_id = payment.siteId;
    this.site_name = payment.siteName;
    this.charger_id = payment.chargerId;
    this.charger_identity = payment.chargerIdentity;
    this.connector_label = payment.connectorLabel;
    this.session_status = payment.sessionStatus;
    this.session_gross_amount = payment.sessionGrossAmount;
    this.energy_wh = payment.energyWh;
  }
}
