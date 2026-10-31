import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

/** Body of PUT /v1/driver/devices: the phone's push token, as its push service gave it to the app. */
export class RegisterDeviceRequestDto {
  @ApiProperty({ enum: ['android', 'ios'] })
  @IsIn(['android', 'ios'])
  readonly platform!: 'android' | 'ios';

  @ApiProperty({ description: "Firebase's registration token, or Apple's device token in hex" })
  @IsString()
  @MinLength(16)
  @MaxLength(4096)
  readonly token!: string;
}
