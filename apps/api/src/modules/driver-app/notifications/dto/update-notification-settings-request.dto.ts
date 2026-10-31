import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** Body of PUT /v1/driver/me/notifications: every switch of the Notifications screen. */
export class UpdateNotificationSettingsRequestDto {
  @ApiProperty() @IsBoolean() readonly started!: boolean;
  @ApiProperty() @IsBoolean() readonly nearly_full!: boolean;
  @ApiProperty() @IsBoolean() readonly finished!: boolean;
  @ApiProperty() @IsBoolean() readonly idle_warning!: boolean;
  @ApiProperty() @IsBoolean() readonly is_push_enabled!: boolean;
  @ApiProperty() @IsBoolean() readonly is_email_enabled!: boolean;
}
