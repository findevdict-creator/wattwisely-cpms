import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Body of POST /v1/messaging/channel/test: whom to send the test message to. */
export class TestMessageRequestDto {
  @ApiProperty({ example: '+44 7700 900123', description: 'A number with its country code' })
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  @Matches(/^\+?[\d\s()-]+$/, { message: 'to must be a phone number' })
  readonly to!: string;
}
