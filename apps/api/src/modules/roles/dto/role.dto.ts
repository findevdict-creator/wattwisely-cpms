import { ApiProperty } from '@nestjs/swagger';
import { RoleRecord } from '../role-record';

/** A role with its permissions, for the roles list and the permission matrix. */
export class RoleDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ nullable: true, example: 'technician', description: 'Set for system roles' })
  readonly key: string | null;

  @ApiProperty({ example: 'Technician' })
  readonly name: string;

  @ApiProperty()
  readonly description: string;

  @ApiProperty({ description: 'System roles are the same for every tenant and cannot be edited' })
  readonly is_system: boolean;

  @ApiProperty({ type: [String], example: ['chargers:read', 'chargers:command'] })
  readonly permissions: string[];

  @ApiProperty({ description: 'Invited and active members holding this role' })
  readonly member_count: number;

  @ApiProperty({ description: 'Sent back as If-Match when changing a custom role' })
  readonly version: number;

  @ApiProperty()
  readonly created_at: string;

  @ApiProperty()
  readonly updated_at: string;

  constructor(role: RoleRecord, memberCount: number) {
    this.id = role.id;
    this.key = role.key;
    this.name = role.name;
    this.description = role.description;
    this.is_system = role.isSystem;
    this.permissions = role.permissionKeys;
    this.member_count = memberCount;
    this.version = role.version;
    this.created_at = role.createdAt.toISOString();
    this.updated_at = role.updatedAt.toISOString();
  }
}
