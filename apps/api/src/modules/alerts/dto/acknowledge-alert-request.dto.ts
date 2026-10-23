import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** POST /v1/alerts/{id}/acknowledge: someone is on it, with a note for the others (NTF-04). */
export class AcknowledgeAlertRequestDto {
  @ApiProperty({ required: false, maxLength: 500, example: 'Engineer booked for 14:00' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly note?: string;
}
