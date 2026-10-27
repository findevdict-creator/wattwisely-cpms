import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethodRow } from '@wattwisely/payments';
import { PaymentMethodDto } from './payment-method.dto';

/** GET /v1/driver/payment-methods: the driver's saved cards, and whether cards can be saved at all. */
export class PaymentMethodsDto {
  @ApiProperty({ type: [PaymentMethodDto] })
  readonly items: PaymentMethodDto[];

  @ApiProperty({ description: 'False when this installation has no payment provider keys' })
  readonly is_provider_enabled: boolean;

  constructor(rows: PaymentMethodRow[], isProviderEnabled: boolean) {
    this.items = rows.map((row) => new PaymentMethodDto(row));
    this.is_provider_enabled = isProviderEnabled;
  }
}
