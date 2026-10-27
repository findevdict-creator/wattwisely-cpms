import { ApiProperty } from '@nestjs/swagger';
import { QuietHoursRecord } from '../notification-settings.repository';

/** A member's quiet hours (story NTF-03): alert e-mails wait until they end, faults excepted. */
export class NotificationSettingsDto {
  @ApiProperty({ nullable: true, type: String, example: '22:00' })
  readonly quiet_hours_start: string | null;

  @ApiProperty({ nullable: true, type: String, example: '07:00' })
  readonly quiet_hours_end: string | null;

  @ApiProperty({ example: 'Europe/London' })
  readonly time_zone: string;

  constructor(settings: QuietHoursRecord) {
    this.quiet_hours_start = settings.quietHoursStart;
    this.quiet_hours_end = settings.quietHoursEnd;
    this.time_zone = settings.timeZone;
  }
}
