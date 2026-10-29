import { ApiProperty } from '@nestjs/swagger';
import { NotificationSettingsRow } from '../notification-settings.repository';

/** GET /v1/driver/me/notifications: what the driver hears about their charges, and how (module 34). */
export class NotificationSettingsDto {
  @ApiProperty({ description: 'When the charger confirms the start' }) readonly started: boolean;
  @ApiProperty({ description: 'At 80%, when the car reports it' }) readonly nearly_full: boolean;
  @ApiProperty({ description: 'When the charge ends and is priced, with the receipt' })
  readonly finished: boolean;
  @ApiProperty({ description: 'Five minutes before the idle fee starts' })
  readonly idle_warning: boolean;
  @ApiProperty() readonly is_push_enabled: boolean;
  @ApiProperty({ description: "E-mails to the login's address, besides the receipt" })
  readonly is_email_enabled: boolean;
  @ApiProperty({ example: 'dana@example.com' }) readonly email: string;
  @ApiProperty({ description: 'How many phones are signed in to receive pushes' })
  readonly device_count: number;

  constructor(row: NotificationSettingsRow, deviceCount: number) {
    this.started = row.wantsStarted;
    this.nearly_full = row.wantsNearlyFull;
    this.finished = row.wantsFinished;
    this.idle_warning = row.wantsIdleWarning;
    this.is_push_enabled = row.isPushEnabled;
    this.is_email_enabled = row.isEmailEnabled;
    this.email = row.email;
    this.device_count = deviceCount;
  }
}
