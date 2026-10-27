/** A role with its permission keys, as the roles repository returns it. */
export interface RoleRecord {
  id: string;
  /** Empty for system roles, which every tenant shares. */
  tenantId: string | null;
  key: string | null;
  name: string;
  description: string;
  isSystem: boolean;
  permissionKeys: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
