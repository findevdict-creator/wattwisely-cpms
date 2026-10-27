import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethodRow } from '@wattwisely/payments';

/** A card the driver saved (module 19): what the app shows, never the number. */
export class PaymentMethodDto {
  @ApiProperty() readonly id: string;
  @ApiProperty({ example: 'visa' }) readonly brand: string;
  @ApiProperty({ example: '4242' }) readonly last4: string;
  @ApiProperty({ example: 12 }) readonly exp_month: number;
  @ApiProperty({ example: 2030 }) readonly exp_year: number;
  @ApiProperty({ description: 'The card a hold is taken from' }) readonly is_default: boolean;
  @ApiProperty() readonly created_at: string;

  constructor(row: PaymentMethodRow) {
    this.id = row.id;
    this.brand = row.brand;
    this.last4 = row.last4;
    this.exp_month = row.expMonth;
    this.exp_year = row.expYear;
    this.is_default = row.isDefault;
    this.created_at = row.createdAt.toISOString();
  }
}
