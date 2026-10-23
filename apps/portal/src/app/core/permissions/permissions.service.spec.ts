import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MeApiService } from '../api/me-api.service';
import { MyPermissions } from '../api/models/my-permissions';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  const permissionsWith = (
    isReadOnly: boolean,
    managedService: MyPermissions['managed_service'] = null,
  ): MyPermissions => ({
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
    managed_service: managedService,
  });

  const serviceWith = async (permissions: MyPermissions) => {
    TestBed.resetTestingModule();
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

  it('is self-serve without a managed service', async () => {
    const service = await serviceWith(permissionsWith(false));

    expect(service.managedService()).toBeNull();
    expect(service.isManaged()).toBe(false);
    expect(service.mustProposeTariffs()).toBe(false);
  });

  it('knows when Wattwisely runs the tenant and whose tariff changes need approval', async () => {
    const managed = {
      status: 'active' as const,
      is_operator: true,
      is_tariff_approval_required: true,
      account_manager_name: 'Sam Support',
      ends_at: null,
    };
    const operator = await serviceWith(permissionsWith(false, managed));
    expect(operator.isManaged()).toBe(true);
    expect(operator.isManagedOperator()).toBe(true);
    expect(operator.mustProposeTariffs()).toBe(true);

    const owner = await serviceWith(permissionsWith(false, { ...managed, is_operator: false }));
    expect(owner.isManaged()).toBe(true);
    expect(owner.mustProposeTariffs()).toBe(false);

    const offered = await serviceWith(
      permissionsWith(false, { ...managed, status: 'pending_acceptance' }),
    );
    expect(offered.isManaged()).toBe(false);
    expect(offered.managedService()?.status).toBe('pending_acceptance');
  });

  it('allows no changes in a suspended tenant', async () => {
    const service = await serviceWith(permissionsWith(true));

    expect(service.can('chargers:command')).toBe(true);
    expect(service.canChange('chargers:command')).toBe(false);
  });
});
