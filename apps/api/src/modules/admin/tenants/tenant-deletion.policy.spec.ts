import { TenantDeletionPolicy } from './tenant-deletion.policy';

describe('TenantDeletionPolicy', () => {
  const suspendedAt = new Date('2026-10-01T09:00:00Z');

  it('allows deletion 30 days after the suspension', () => {
    const tenant = { status: 'suspended' as const, suspendedAt };

    expect(TenantDeletionPolicy.allowedFrom(tenant)).toEqual(new Date('2026-10-31T09:00:00Z'));
    expect(TenantDeletionPolicy.canDelete(tenant, new Date('2026-10-30T09:00:00Z'))).toBe(false);
    expect(TenantDeletionPolicy.canDelete(tenant, new Date('2026-10-31T09:00:00Z'))).toBe(true);
  });

  it('never allows deleting a tenant that is not suspended', () => {
    expect(TenantDeletionPolicy.allowedFrom({ status: 'active', suspendedAt })).toBeNull();
    expect(TenantDeletionPolicy.canDelete({ status: 'suspended', suspendedAt: null })).toBe(false);
  });
});
