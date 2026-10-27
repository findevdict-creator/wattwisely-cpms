import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Body of PUT /v1/messaging/channel: the whole channel; leave access_token out to keep the stored one. */
export class UpdateMessagingChannelRequestDto {
  @ApiProperty({ example: '106540352242922' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^\d+$/, { message: 'phone_number_id must be the digits Meta shows' })
  readonly phone_number_id!: string;

  @ApiProperty({ example: '+44 7700 900123' })
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  readonly display_phone_number!: string;

  @ApiProperty({
    required: false,
    description: 'The channel’s own token; an empty string removes it',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly access_token?: string;

  @ApiProperty({
    required: false,
    description: 'The first line drivers get; empty for the default',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  readonly greeting?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  readonly is_active?: boolean;
}
