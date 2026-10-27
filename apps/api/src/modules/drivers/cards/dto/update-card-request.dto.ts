import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** Body of PATCH /v1/drivers/{id}/cards/{cardId}: the label, the status, the end date. The tag never changes. */
export class UpdateCardRequestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly label?: string;

  @ApiProperty({ required: false, enum: ['active', 'blocked', 'lost'] })
  @IsOptional()
  @IsIn(['active', 'blocked', 'lost'])
  readonly status?: 'active' | 'blocked' | 'lost';

  @ApiProperty({ required: false, nullable: true, description: 'Null clears the end date' })
  @IsOptional()
  @IsDateString()
  readonly expires_at?: string | null;
}
