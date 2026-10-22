import { TestBed } from '@angular/core/testing';
import { Me } from '../api/models/me';
import { LastTenantStore } from './last-tenant.store';
import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  const acme = { id: 'org-acme', alias: 'acme-charging' };
  const volt = { id: 'org-volt', alias: 'volt-hotels' };
  const meWith = (tenants: Me['tenants']): Me => ({
    id: 'user-1',
    email: 'u@test',
    name: 'U',
    is_platform_staff: false,
    tenants,
  });
  let service: TenantContextService;

  beforeEach(() => {
    localStorage.clear();
    service = TestBed.inject(TenantContextService);
  });

  it('opens the only tenant straight away', () => {
    service.setMe(meWith([acme]));

    expect(service.currentTenant()).toEqual(acme);
  });

  it('opens the tenant used last time', () => {
    new LastTenantStore().write('org-volt');

    service.setMe(meWith([acme, volt]));

    expect(service.currentTenantId()).toBe('org-volt');
  });

  it('chooses nothing when there are several tenants and none was used before', () => {
    service.setMe(meWith([acme, volt]));

    expect(service.currentTenantId()).toBeNull();
  });

  it('ignores a remembered tenant the user no longer belongs to', () => {
    new LastTenantStore().write('org-gone');

    service.setMe(meWith([acme, volt]));

    expect(service.currentTenantId()).toBeNull();
  });

  it('remembers a selected tenant for the next login', () => {
    service.setMe(meWith([acme, volt]));

    service.selectTenant(volt);

    expect(new LastTenantStore().read()).toBe('org-volt');
  });
});
