import { ApiProperty } from '@nestjs/swagger';
import { DriverChargeDto } from '../../charges/dto/driver-charge.dto';
import { NotificationSettingsDto } from '../../notifications/dto/notification-settings.dto';
import { DriverOperatorProfileDto } from '../../operators/dto/driver-operator-profile.dto';
import { PaymentMethodDto } from '../../payment-methods/dto/payment-method.dto';
import { DriverMeDto } from './driver-me.dto';

/** The parts of a driver's data export, as the app's own routes answer them. */
export interface DriverDataExportParts {
  account: DriverMeDto;
  operators: DriverOperatorProfileDto[];
  cards: PaymentMethodDto[];
  charges: DriverChargeDto[];
  notifications: NotificationSettingsDto;
}

/** GET /v1/driver/me/export: everything held about the driver, as one JSON file (module 33). */
export class DriverDataExportDto {
  @ApiProperty() readonly exported_at: string;
  @ApiProperty({ type: DriverMeDto }) readonly account: DriverMeDto;
  @ApiProperty({ type: [DriverOperatorProfileDto], description: 'What each linked operator keeps' })
  readonly operators: DriverOperatorProfileDto[];
  @ApiProperty({ type: [PaymentMethodDto], description: 'Brand, last 4 digits and expiry only' })
  readonly cards: PaymentMethodDto[];
  @ApiProperty({ type: [DriverChargeDto] }) readonly charges: DriverChargeDto[];
  @ApiProperty({ type: NotificationSettingsDto }) readonly notifications: NotificationSettingsDto;

  constructor(parts: DriverDataExportParts) {
    this.exported_at = new Date().toISOString();
    this.account = parts.account;
    this.operators = parts.operators;
    this.cards = parts.cards;
    this.charges = parts.charges;
    this.notifications = parts.notifications;
  }
}
