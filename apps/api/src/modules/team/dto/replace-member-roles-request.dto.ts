import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { RoleAssignmentDto } from './role-assignment.dto';

/** Body of PUT /v1/members/{id}/roles: the member's complete new set of roles. */
export class ReplaceMemberRolesRequestDto {
  @ApiProperty({ type: [RoleAssignmentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RoleAssignmentDto)
  readonly roles!: RoleAssignmentDto[];
}
