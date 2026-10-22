import { AuthenticatedUser } from '../auth/authenticated-user';
import { TenantMembership } from './tenant-membership';
import { TenantMembershipResolver } from './tenant-membership.resolver';

describe('TenantMembershipResolver', () => {
  const resolver = new TenantMembershipResolver();
  const acme = new TenantMembership('org-1', 'acme-charging');
  const volt = new TenantMembership('org-2', 'volt-hotels');
  const userOf = (memberships: TenantMembership[]): AuthenticatedUser =>
    new AuthenticatedUser({
      id: 'user-1',
      email: 'u@test',
      name: 'U',
      isPlatformStaff: false,
      memberships,
    });

  it('uses the tenant from X-Tenant-Id when the user is a member', () => {
    expect(resolver.resolve(userOf([acme, volt]), 'org-2')).toBe(volt);
  });

  it('answers 404 for a tenant the user does not belong to, so it does not reveal that it exists', () => {
    expect(() => resolver.resolve(userOf([acme]), 'org-2')).toThrow(
      expect.objectContaining({ code: 'tenant_not_found', status: 404 }),
    );
  });

  it('picks the only tenant when no header is sent', () => {
    expect(resolver.resolve(userOf([acme]), undefined)).toBe(acme);
  });

  it('asks for a header when the user belongs to several tenants', () => {
    expect(() => resolver.resolve(userOf([acme, volt]), undefined)).toThrow(
      expect.objectContaining({ code: 'tenant_required', status: 400 }),
    );
  });

  it('asks for a header when the user belongs to no tenant', () => {
    expect(() => resolver.resolve(userOf([]), undefined)).toThrow(
      expect.objectContaining({ code: 'tenant_required' }),
    );
  });
});
