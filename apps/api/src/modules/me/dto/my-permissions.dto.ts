import { ApiProperty } from '@nestjs/swagger';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { GrantedPermissionDto } from './granted-permission.dto';
import { HeldRoleDto } from './held-role.dto';
import { MyPlanDto } from './my-plan.dto';

/** Body of GET /v1/me/permissions: what I may do in the current tenant, so the portal can hide what I can't. */
export class MyPermissionsDto {
  @ApiProperty()
  readonly tenant_id: string;

  @ApiProperty({ description: 'A suspended tenant is read-only' })
  readonly is_read_only: boolean;

  @ApiProperty({ type: [HeldRoleDto] })
  readonly roles: HeldRoleDto[];

  @ApiProperty({ type: [GrantedPermissionDto] })
  readonly permissions: GrantedPermissionDto[];

  @ApiProperty({
    type: MyPlanDto,
    nullable: true,
    description: 'Null until Wattwisely sets a plan',
  })
  readonly plan: MyPlanDto | null;

  @ApiProperty({
    type: [String],
    description: 'Modules my permissions could reach but the plan does not include',
    example: ['load_management'],
  })
  readonly locked_modules: string[];

  constructor(access: TenantAccess) {
    this.tenant_id = access.tenant.id;
    this.is_read_only = access.tenant.isSuspended;
    this.roles = access.grants.map((grant) => new HeldRoleDto(grant));
    this.permissions = access.permissions
      .keys()
      .map((key) => new GrantedPermissionDto(key, access.permissions.scopeFor(key)));
    this.plan = access.entitlements.plan ? new MyPlanDto(access.entitlements.plan) : null;
    this.locked_modules = access.entitlements.lockedModuleKeys();
  }
}
