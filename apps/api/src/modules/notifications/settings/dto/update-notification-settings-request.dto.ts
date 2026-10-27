import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, Validate } from 'class-validator';
import { IsTimeZoneConstraint } from '../../../../common/validation/is-time-zone.constraint';

/** Body of PUT /v1/notification-settings. Both times empty switch quiet hours off. */
export class UpdateNotificationSettingsRequestDto {
  static readonly TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

  @ApiProperty({ required: false, nullable: true, example: '22:00' })
  @IsOptional()
  @Matches(UpdateNotificationSettingsRequestDto.TIME, {
    message: 'quiet_hours_start must be HH:MM',
  })
  readonly quiet_hours_start?: string | null;

  @ApiProperty({ required: false, nullable: true, example: '07:00' })
  @IsOptional()
  @Matches(UpdateNotificationSettingsRequestDto.TIME, { message: 'quiet_hours_end must be HH:MM' })
  readonly quiet_hours_end?: string | null;

  @ApiProperty({ example: 'Europe/London' })
  @IsString()
  @Validate(IsTimeZoneConstraint)
  readonly time_zone!: string;
}
