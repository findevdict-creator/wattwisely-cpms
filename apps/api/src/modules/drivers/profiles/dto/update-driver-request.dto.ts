import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Body of PATCH /v1/drivers/{id}: only the fields sent change; null clears e-mail or phone. */
export class UpdateDriverRequestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  readonly name?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  readonly email?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  readonly phone?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly reference?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  readonly notes?: string;

  @ApiProperty({
    required: false,
    enum: ['inherit', 'pay', 'free'],
    description:
      'Whether the driver’s sessions are paid; free only when you settle with them another way',
  })
  @IsOptional()
  @IsIn(['inherit', 'pay', 'free'])
  readonly payment_mode?: 'inherit' | 'pay' | 'free';

  @ApiProperty({ required: false, type: [String], description: 'Replaces the driver’s groups' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  readonly group_ids?: string[];
}
