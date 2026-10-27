import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, MaxLength } from 'class-validator';

/** Body of PUT /v1/public/charges/{key}/notifications. */
export class UpdateChargeNotificationsRequestDto {
  @ApiProperty({ example: 'dana@example.com' })
  @IsEmail()
  @MaxLength(254)
  readonly email!: string;

  @ApiProperty() @IsBoolean() readonly started!: boolean;
  @ApiProperty() @IsBoolean() readonly nearly_full!: boolean;
  @ApiProperty() @IsBoolean() readonly finished!: boolean;
  @ApiProperty() @IsBoolean() readonly idle_warning!: boolean;
}
