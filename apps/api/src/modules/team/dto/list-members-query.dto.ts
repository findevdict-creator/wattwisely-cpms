import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Query of GET /v1/members. Without status, invited and active members are listed. */
export class ListMembersQueryDto {
  @ApiProperty({ required: false, enum: ['invited', 'active', 'removed'] })
  @IsOptional()
  @IsIn(['invited', 'active', 'removed'])
  readonly status?: 'invited' | 'active' | 'removed';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('all')
  readonly role_id?: string;

  @ApiProperty({ required: false, description: 'Searches name and e-mail' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly q?: string;
}
