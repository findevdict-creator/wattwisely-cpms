import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Body of POST /v1/webhooks (module 16): where to send which events. */
export class CreateWebhookRequestDto {
  @ApiProperty({ example: 'https://hooks.acme.example/wattwisely' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  readonly url!: string;

  @ApiProperty({ required: false, example: 'The fleet system' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  readonly description?: string;

  @ApiProperty({ type: [String], example: ['session.completed'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  readonly event_types!: string[];
}
