import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MeApiService } from '../api/me-api.service';
import { MyPermissions } from '../api/models/my-permissions';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  const permissionsWith = (isReadOnly: boolean): MyPermissions => ({
    tenant_id: 'tenant-1',
    is_read_only: isReadOnly,
    plan: { code: 'starter', name: 'Starter' },
    locked_modules: ['advanced_reports'],
    roles: [
      { role_id: 'r1', key: 'technician', name: 'Technician', site_id: 'site-1' },
      { role_id: 'r1', key: 'technician', name: 'Technician', site_id: 'site-2' },
    ],
    permissions: [
      { key: 'chargers:read', site_ids: ['site-1', 'site-2'] },
      { key: 'chargers:command', site_ids: ['site-1', 'site-2'] },
    ],
  });

  const serviceWith = async (permissions: MyPermissions) => {
    TestBed.configureTestingModule({
      providers: [{ provide: MeApiService, useValue: { getPermissions: () => of(permissions) } }],
    });
    const service = TestBed.inject(PermissionsService);
    await service.ensureLoaded();
    return service;
  };

  it('knows which permissions the user holds, on any site', async () => {
    const service = await serviceWith(permissionsWith(false));

    expect(service.can('chargers:command')).toBe(true);
    expect(service.can('team:manage')).toBe(false);
    expect(service.roleNames()).toEqual(['Technician']);
  });

  it('knows the plan and which modules it leaves locked', async () => {
    const service = await serviceWith(permissionsWith(false));

    expect(service.plan()?.name).toBe('Starter');
    expect(service.isModuleLocked('advanced_reports')).toBe(true);
    expect(service.isModuleLocked('sessions')).toBe(false);
  });

  it('allows no changes in a suspended tenant', async () => {
    const service = await serviceWith(permissionsWith(true));

    expect(service.can('chargers:command')).toBe(true);
    expect(service.canChange('chargers:command')).toBe(false);
  });
});
