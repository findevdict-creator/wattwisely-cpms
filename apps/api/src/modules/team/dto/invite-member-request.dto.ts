import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { RoleAssignmentDto } from './role-assignment.dto';

/** Body of POST /v1/members/invites. */
export class InviteMemberRequestDto {
  @ApiProperty({ example: 'tom@acme.example' })
  @IsEmail()
  @MaxLength(254)
  readonly email!: string;

  @ApiProperty({ type: [RoleAssignmentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RoleAssignmentDto)
  readonly roles!: RoleAssignmentDto[];
}
