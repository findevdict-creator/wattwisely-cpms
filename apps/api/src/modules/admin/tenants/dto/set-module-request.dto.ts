import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/** Body of PUT /v1/admin/tenants/{id}/modules/{key}: switch a module on or off for one tenant. */
export class SetModuleRequestDto {
  @ApiProperty({
    enum: ['addon', 'trial', 'override'],
    description: 'Why the tenant gets (or loses) it',
  })
  @IsIn(['addon', 'trial', 'override'])
  readonly source!: 'addon' | 'trial' | 'override';

  @ApiProperty({ default: true, description: 'False (override only) takes a plan module away' })
  @IsOptional()
  @IsBoolean()
  readonly is_enabled?: boolean;

  @ApiProperty({ required: false, nullable: true, description: 'When a trial ends' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}(T.*)?$/, { message: 'ends_at must be a date' })
  readonly ends_at?: string | null;

  @ApiProperty({ required: false, example: 'Pilot agreed with the sales team' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly note?: string;
}
