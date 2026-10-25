import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** The characters OCPP 1.6 allows in an idTag (CiString20Type): at most 20 of these. */
export const ID_TAG_PATTERN = /^[A-Za-z0-9*_=:+|@.-]{1,20}$/;

/** Body of POST /v1/drivers/{id}/cards (story DRV-03): the tag as the charger reads it. */
export class AddCardRequestDto {
  @ApiProperty({ example: '04A1B2C3D4E5F6', maxLength: 20 })
  @IsString()
  @Matches(ID_TAG_PATTERN, { message: 'id_tag must be 1 to 20 letters, digits or *_=:+|@.-' })
  readonly id_tag!: string;

  @ApiProperty({ required: false, example: 'Blue card' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly label?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'When the card stops working (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  readonly expires_at?: string | null;

  @ApiProperty({
    required: false,
    enum: ['inherit', 'pay', 'free'],
    description: 'Whether a session this card starts is paid; free only for a card you settle another way',
  })
  @IsOptional()
  @IsIn(['inherit', 'pay', 'free'])
  readonly payment_mode?: 'inherit' | 'pay' | 'free';
}
