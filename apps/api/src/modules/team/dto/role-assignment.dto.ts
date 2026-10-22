import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsUUID } from 'class-validator';

/** A role to give, for the whole tenant (no site_ids) or for chosen sites. */
export class RoleAssignmentDto {
  @ApiProperty({ example: '00000000-0000-7000-8000-000000000004' })
  @IsUUID('all')
  readonly role_id!: string;

  @ApiProperty({ required: false, type: [String], description: 'Leave out for the whole tenant' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  readonly site_ids?: string[];
}
